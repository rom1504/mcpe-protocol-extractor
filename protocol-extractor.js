var fs = require('fs');
if (process.argv.length != 3) {
  console.log("Usage : node protocol-extractor.js <pocketMinePath>");
  process.exit(1);
}


writePackets(parsePackets(process.argv[2]));


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


function writePackets(packets) {
  fs.writeFile("packets.json", JSON.stringify(packets, null, 2));
}
