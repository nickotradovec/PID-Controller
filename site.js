function getData() {
    return Math.random();
}
Plotly.plot('chart', [{
    y: [getData()],
    type: 'line'
}]);

var cnt = 0;
setInterval(function () {
    Plotly.extendTraces('chart', { y: [[getData()]] }, [0]);
    cnt++;
    if (cnt > 300) {
        Plotly.relayout('chart', {
            xaxis: {
                range: [cnt - 300, cnt]
            }
        });
    }

}, 20);
