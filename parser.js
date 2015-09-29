var fs = require('fs');
var parser = require('php-parser');

if (process.argv.length != 3) {
  console.log("Usage : node parser.js <pocketMinePath>");
  process.exit(1);
}

var pocketMinePath = process.argv[2];


function readPacket(file) {
  var AST = readAST(file);
  var inside = getInsideNamespace(AST);
  var cl = findClass(inside);
  var insideCl = findInsideClass(cl);
  var methods = getMethods(insideCl);
  var clientBound = methods["encode"].length > 0;
  var serverBound = methods["decode"].length > 0;
  var fields = clientBound ? readEncodeFields(methods["encode"]) : readDecodeFields(methods["decode"]);
  var packetName = getPacketName(insideCl);
  return {
    packetName: packetName.toLowerCase(),
    clientBound: clientBound,
    serverBound: serverBound,
    fields: fields
  };
}

function readAST(file) {
  return parser.parseEval(fs.readFileSync(file, 'utf8').substr(5));
}

function getInsideNamespace(AST) {
  return AST[1][0][2];
}

function findClass(inside) {
  var classes = inside.filter(function (part) {
    return part && part.length > 0 && part[0] == "class";
  });
  if (classes.length == 0) return null;
  return classes[0];
}

function findInsideClass(cl) {
  return cl[5];
}

function getMethods(insideCl) {
  return insideCl["methods"].reduce(function (methods, f) {
    methods[f[2]] = f[6];
    return methods;
  }, {});
}

function getPacketName(insideCl) {
  return insideCl["constants"][0][0][1][1][1];
}

var hlParser = require("./high_level_php_parser.js");

function expressionToField(expression) {
  if (expression.kind == "call" && expression.func.kind == "prop" && expression.func.field.value.substr(0, 3) == "put" && expression.args.length == 1) {
    var arg=expression.args[0];
    if (arg.kind == "prop")
      return {
        name: arg.field.value,
        type: expression.func.field.value.substr(3).toLowerCase()
      };
    if (arg.kind == "var" && arg.name == "$meta")
      return {
        name: "metadata",
        type: "metadata"
      };
    if (arg.kind == "call" && arg.func.kind == "ns" && (arg.func.namespaces[0] == "count" || arg.func.namespaces[0] =="strlen"))
      return {
        name: arg.args[0].field.value,
        type: ["count", expression.func.field.value.substr(3).toLowerCase()]
      };
    if (arg.kind == "call" && arg.args.length == 0 && arg.func.kind == "prop"
      && arg.func.field.value.substr(0, 3) == "get")
      return {
        name: arg.func.field.value.substr(3).toLowerCase(),
        type: expression.func.field.value.substr(3).toLowerCase()
      };
    if(arg.kind == "offset")
      return {
        name: "num"+arg.offset.value,
        type: expression.func.field.value.substr(3).toLowerCase()
      };
  }
  else if (expression.kind == "foreach") {
    var fields = expression.insideExpressions.map(expressionToField);
    return {
      "name": expression.array.field.value,
      "type": ["array", {"type": fields.length == 1 ? fields[0] : ["container", fields]}]
    }
  }
  // excluded expressions
  if(!(expression.kind=="call" && expression.func.kind=="prop" && expression.func.field.value=="reset") &&
    !(expression.kind=="set" && expression.var.name=="$meta")) console.log(JSON.stringify(expression, null, 1));
  return null;
}

function postProcessFields(fields) {
  var newFields = [];
  // put together count and array
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].type.length == 2 && fields[i].type[0] == "count") {
      if(!fields[i+1] || fields[i+1].type[0]!="array")
      {
        console.log("missing array");
        newFields.push(fields[i]);
        continue;
      }
      var newArray = {
        name: fields[i + 1].name,
        type: [
          "array",
          {
            countType: fields[i].type[1],
            type: fields[i + 1].type[1].type
          }
        ]
      };
      newFields.push(newArray);
      i++;
    }
    else
      newFields.push(fields[i]);
  }
  return newFields;
}

function readEncodeFields(method) {
  var expressions = hlParser.parseExpressions(method);
  var fields = expressions.map(expressionToField).filter(function (field) {
    return field != null;
  });
  return postProcessFields(fields);
}

function readDecodeFields(method) {
  return "decode";
}

function readPackets(pocketMinePath) {
  var path = pocketMinePath + "/src/pocketmine/network/protocol/";
  var files = fs.readdirSync(path);
  return files
    .filter(function (name) {
      return !(name == "DataPacket.php" || name == "Info.php" || name.indexOf(".swp")!=-1);
    })
    .map(function (name) {
      console.log(name);
      return readPacket(path+"/"+name)
    });
}


function writeProtocol(protocol) {
  fs.writeFile("protocol.json", JSON.stringify(protocol, null, 2));
}

var cl = readPackets(pocketMinePath);


//var cl = readPacket(pocketMinePath +
//  '/src/pocketmine/network/protocol/AddEntityPacket.php');

//var cl=readPacket(pocketMinePath +
//  '/src/pocketmine/network/protocol/UpdateAttributesPacket.php');


//console.log(JSON.stringify(cl, null, 2));

writeProtocol(cl);


//var part=AST[1][0][2][2][5]["methods"][1][6];
//console.log(JSON.stringify(part,null,2));
//findClass(AST);