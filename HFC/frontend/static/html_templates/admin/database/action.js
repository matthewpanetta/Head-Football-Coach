const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });
  const nunjucks_env = await get_nunjucks_env();

  let database_name = common.params.database;
  let db = await common.get_db({database_name:database_name})
  let tables = db.tables;

  var render_content = {
    db: db,
    tables: tables,
  };

  console.log("render_content", render_content);

  var url = "/static/html_templates/admin/database/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/admin/Database/:database");
  common.startTime = startTime;

  await getHtml(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
