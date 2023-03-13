const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });
  const nunjucks_env = await get_nunjucks_env();

  let database_name = common.params.database;
  let table_name = common.params.table;
  let db = await common.get_db({database_name:database_name})

  console.log({db:db});
  console.log({table: db[table_name]})

  let table = db[table_name];

  let fields = new Set();
  if (table.schema && table.schema.primKey){
    fields.add(table.schema.primKey.keyPath)
  }
  if (table.schema && table.schema.indexes){
    for (let index of table.schema.indexes){
      fields.add(index.name)
    }
  }
  
  let elems = await table.toArray()

  for (let elem of elems){
    for (let field in elem){
      fields.add(field)
    }
  }

  var render_content = {
    db: db,
    table:table, 
    elems: elems,
    fields:fields
  };

  console.log("render_content", render_content);

  var url = "/html_templates/admin/table/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/admin/Database/:database/Table/:table");
  common.startTime = startTime;

  await getHtml(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
