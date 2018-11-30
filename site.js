var blnPaused = false;
var displayTimeSec = 10;
var screenUpdateIntervalMilliSec = 20;
var displayPoints = displayTimeSec * 1000 / screenUpdateIntervalMilliSec;

var desiredPIDPollingRate = 200;
var usePIDIntervalMilliSec = getPIDPollingRate();

$("#pausebutton").click(function() {blnPaused = !blnPaused;});

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
        if (cnt > displayPoints) {
            Plotly.relayout('chart', {
                xaxis: {
                    range: [cnt - displayPoints, cnt]
                }
            });
        };

    };
}, screenUpdateIntervalMilliSec);

function getPIDPollingRate() {
    // ensure we are polling at a multiple of the screen refresh rate.
    Math.floor(1000/desiredPIDPollingRate) // rate that is desired.

    var multiple = Math.floor(screenUpdateIntervalMilliSec / (Math.floor(1000/desiredPIDPollingRate)));
    return multiple * screenUpdateIntervalMilliSec;
}

function getData() {
    return Math.random();
}

var Controller = {
    tuneP: 0,
    tuneI: 0,
    tuneD: 0,
    maxForceMagnitude: 0,
    currentOutputForce: 0,
    GetNewOutput: function(timeInterval, currentPosition, externalForce, input) {       
        // update currentOutputForce
    }
}

var Model = {
    mass: 0,
    GetNewState: function(timeInterval, externalForce, internalForce) {

    }
}

var ExternalForce = {
    maxFrequency: 0,
    maxMagnitude: 0,
    currentExternalForce,
    GetExternalForce: function(time) {
        // update currentExternalForce
    }
}

