var fs = require('fs');
if (process.argv.length != 3) {
  console.log("Usage : node protocol-extractor.js <pocketMinePath>");
  process.exit(1);
}

var pocketMinePath = process.argv[2];

generateProtocol(pocketMinePath);

function generateProtocol(pocketMinePath) {
  var nameToId = parseNameToId(pocketMinePath);
  var packets = parsePackets(pocketMinePath);
  var packetsWithIds = addIds(nameToId, packets);
  var protocol = packetsToProtocol(packetsWithIds);
  writeProtocol(protocol);
}

function packetsToProtocol(packets) {
  return packets.reduce(function (protocol, packet) {
    protocol[packet.packetName.toLowerCase()] = {
      id: packet.id,
      fields: packet.fields
    };
    return protocol;
  }, {});
}

function addIds(nameToId, packets) {
  return packets.map(function (packet) {
    return {
      id: nameToId[packet.packetName],
      packetName: packet.packetName,
      fields: packet.fields
    }
  });
}


function writeProtocol(protocol) {
  fs.writeFile("protocol.json", JSON.stringify(protocol, null, 2));
}


function parseNameToId(pocketMinePath) {
  return fs
    .readFileSync(pocketMinePath + '/src/pocketmine/network/protocol/Info.php', 'utf8')
    .split("\n")
    .map(function (line) {
      return line.match(/const (.+?) = (.+);/)
    })
    .filter(function (results) {
      return results != null;
    })
    .reduce(function (nameToId, results) {
      nameToId[results[1]] = results[2];
      return nameToId;
    }, {});
}

function parsePackets(pocketMinePath) {
  var path = pocketMinePath + "/src/pocketmine/network/protocol/";
  var files = fs.readdirSync(path);
  return files
    .filter(function (name) {
      return !(name == "DataPacket.php" || name == "Info.php");
    })
    .map(function (name) {
      var file = (fs.readFileSync(path + name, 'utf8'));
      var packetName = "";
      var fields = [];
      var lines = file.split("\n");
      lines.forEach(function (line) {
        var results;
        if (results = line.match(/const NETWORK_ID = Info::(.+);/))
          packetName = results[1];
        else if (results = line.match(/\$this->put(.+?)\(\$this->(.+?)\);/))
          fields.push({
            name: results[1],
            type: results[2]
          });
      });
      return {
        packetName: packetName,
        fields: fields
      }
    });
}

