const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });
  const nunjucks_env = await get_nunjucks_env();

  let databases = await indexedDB.databases();

  console.log({ databases: databases });

  var render_content = {
    databases: databases,
  };

  console.log("render_content", render_content);

  var url = "/html_templates/admin/admin/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/admin/");
  common.startTime = startTime;

  await getHtml(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
