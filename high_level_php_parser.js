module.exports = {
  parseExpression: parseExpression,
  parseExpressions: parseExpressions
};

//TODO : a general parseProgram (requires a parseClass)


var kindToParser = {
  "call": parseCall,
  "prop": parseProp,
  "var": parseVar,
  "string": parseString,
  "set": parseSet,
  "static": parseStatic,
  "ns": parseNs,
  "foreach": parseForeach,
  "offset": parseOffset,
  "number": parseNumber,
  "if": parseIf,
  "retif": parseRetif,
  "new": parseNew,
  "unary": parseUnary
};

function parseExpression(expression) {
  var kind = expression[0];
  if (kindToParser[kind])
    return kindToParser[kind](expression);
  console.log(kind + " not parsed : " + JSON.stringify(expression, null, 2));
  return expression;
}

function parseCall(expression) {
  return {
    kind: "call",
    func: parseExpression(expression[1]),
    args: expression[2].map(parseExpression)
  }
}

function parseProp(expression) {
  return {
    kind: "prop",
    object: parseExpression(expression[1]),
    field: parseExpression(expression[2])
  }
}

function parseVar(expression) {
  return {
    kind: "var",
    name: expression[1]
  }
}

function parseString(expression) {
  return {
    kind: "string",
    value: expression[1]
  }
}

function parseSet(expression) {
  return {
    kind: "set",
    var: parseExpression(expression[1]),
    value: parseExpression(expression[2])
  }
}

function parseStatic(expression) {
  return {
    kind: "static",
    type: expression[1],
    location: parseExpression(expression[2]),
    value: expression[3]
  };
}

function parseNs(expression) {
  return {
    kind: "ns",
    namespaces: expression[1]
  };
}

function parseForeach(expression) {
  return {
    kind: "foreach",
    array: parseExpression(expression[1]),
    element: parseExpression(expression[3]),
    insideExpressions: parseExpressions(expression[4])
  };
}

function parseOffset(expression) {
  return {
    kind: "offset",
    variable: parseExpression(expression[1]),
    offset: parseExpression(expression[2])
  }
}

function parseNumber(expression) {
  return {
    kind: "number",
    value: expression[1]
  }
}

function parseIf(expression) {
  return {
    kind: "if",
    condition: expression[1],
    then:expression[2] ? parseExpressions(expression[2]) : [],
    else:expression[3] ? parseExpressions(expression[3]) : []
  }
}

function parseRetif(expression) {
  return {
    kind: "retif",
    condition:expression[1],
    then:parseExpression(expression[2]),
    else:parseExpression(expression[3])
  }
}

function parseNew(expression) {
  return {
    kind: "new",
    cl:expression[1],
    args:parseExpressions(expression[2])
  }
}

function parseUnary(expression) {
  return {
    kind: "unary",
    operation: expression[1],
    expr:parseExpression(expression[2])
  }
}

function parseExpressions(expressions) {
  return expressions.map(parseExpression);
}