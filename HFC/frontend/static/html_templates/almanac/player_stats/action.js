

$(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/PlayerStats/");
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
