$(document).ready(function(){
  console.log('In Game.js');
  $('.gamePlayerBoxStats').find('table').DataTable( {
    "searching": false,
    "info": false,
    "paging":   false,
    "ordering": false
  });
});
