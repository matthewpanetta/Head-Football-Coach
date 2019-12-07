
function initBracket(BracketData) {

  console.log('BracketData',BracketData);


  $(function() {
        $('#flat-bracket').bracket({
          skipConsolationRound: true,
          //disableHighlight: true,
          teamWidth: 100,
          init: BracketData /* data to initialize the bracket with */
        })
  });


}
