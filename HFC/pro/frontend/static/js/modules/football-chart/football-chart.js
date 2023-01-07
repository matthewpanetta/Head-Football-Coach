const initialize_football_chart = async (
  common,
  data,
  field_list,
  display_name_field,
  display_src_field,
  display_href_field,
  display_color_field,
  chart_title
) => {
  console.log(
    "in initialize_football_chart",
    common,
    data,
    field_list,
    display_name_field,
    display_src_field,
    display_href_field,
    display_color_field,
    chart_title
  );

  var modal_url =
    "/static/html_templates/common_templates/football-chart/chart-modal.njk";
  var html = await fetch(modal_url);
  html = await html.text();
  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: common.page,
    data: data,
    field_list: field_list,
    display_name_field: display_name_field,
    display_src_field: display_src_field,
    display_href_field: display_href_field,
    display_color_field: display_color_field,
    chart_title: chart_title,
  });
  console.log({ renderedHtml: renderedHtml });

  $("body").append('<div id="football-chart-modal"></div>');
  $("#football-chart-modal").html(renderedHtml);
  $("#football-chart-modal").addClass("shown");

  $(window).on("click", function (event) {
    if ($(event.target)[0] == $("#football-chart-modal")[0]) {
      $("#football-chart-modal").removeClass("shown");
      $(window).unbind();
    }
  });

  let field = field_list[0];
  await draw_chart(
    common,
    data,
    field,
    display_name_field,
    display_src_field,
    display_href_field,
    display_color_field
  );

  $('#football-chart-select').on('change', async function(){

    let selected_value = $(this).val();
    field = field_list.find(f => f.field == selected_value);

    await draw_chart(
        common,
        data,
        field,
        display_name_field,
        display_src_field,
        display_href_field,
        display_color_field
      );
  })
};

const draw_chart = async (
    common,
  data,
  field,
  display_name_field,
  display_src_field,
  display_href_field,
  display_color_field
) => {

    console.log({
        data:data, field:field, display_name_field:display_name_field, display_src_field:display_src_field,
        display_href_field:display_href_field, display_color_field:display_color_field, 
    })

    if (!field.max_value){
        field.max_value = Math.max(...data.map(d => get(d, field.field)));
    }

    if (field.sort != 'none'){
        data = data.sort((d_a, d_b) => get(d_b, field.field) - get(d_a, field.field));
    }
    data.forEach(d=> d.value = get(d, field.field))
    data.forEach(function(d){
        if (field.max_value){
            d.value_width = Math.max(3, d.value * 100.0 / field.max_value)
        }
        else {
            d.value_width = 3;
        }
    });

    var table_url =
    "/static/html_templates/common_templates/football-chart/football-chart-table-contents.njk";
    var html = await fetch(table_url);
    html = await html.text();
    var renderedHtml = await common.nunjucks_env.renderString(html, {
        page: common.page,
        data: data,
        field: field,
        display_name_field: display_name_field,
        display_src_field: display_src_field,
        display_href_field: display_href_field,
        display_color_field: display_color_field,
    });
    console.log({ renderedHtml: renderedHtml });

    $(".football-chart-table").html(renderedHtml);
};
