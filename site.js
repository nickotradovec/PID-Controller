function getData() {
    return Math.random();
}

var blnPaused = false;

document.getElementById("pausebutton").addEventListener("click", function () {
    blnPaused = !blnPaused;
});

Plotly.plot('chart', [{
    y: [getData()],
    type: 'line',
    name: 'test1'
}]);

var cnt = 0;
setInterval(function () {

    if (!blnPaused) {

        Plotly.extendTraces('chart', { y: [[getData()]] }, [0]);

        cnt++;
        if (cnt > 300) {
            Plotly.relayout('chart', {
                xaxis: {
                    range: [cnt - 300, cnt]
                }
            });
        };

    };
}, 20);