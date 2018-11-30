var blnPaused = false;
var displayTimeSec = 10;
var screenUpdateIntervalMilliSec = 20;
var displayPoints = displayTimeSec * 1000 / screenUpdateIntervalMilliSec;

var desiredPIDPollingRate = 200;
var usePIDIntervalMilliSec = getPIDPollingRate();

let Wave = {
    period: 0,
    amplitude: 0,
    offset: 0,
    frequency: function() {
        return 1 / this.period;
    }
}

let ExternalForce = {
    currentExternalForce: 0,
    waveComponents: 10,
    arrayRandomWaves: [],

    GenerateRandomSignal: function(minPeriod, maxPeriod, maxAmplitude) {
        
        for(i=0; i<this.waveComponents; i++) {
            //consider restricting wave frequencies as a function of amplitude
            var waveComponent = Object.create(Wave);
            waveComponent.amplitude = (maxAmplitude / Math.sqrt(this.waveComponents)) * Math.random();
            waveComponent.period = (maxPeriod - minPeriod) * Math.random() + minPeriod;
            waveComponent.offset = Math.random() * waveComponent.frequency();
            this.arrayRandomWaves.push(waveComponent)
        }
    },

    GetExternalForce: function(time) {
        // update currentExternalForce
        var force = 0;
        for(i=0; i<this.arrayRandomWaves.length; i++) {
            force += this.arrayRandomWaves[i].amplitude * Math.sin((time * this.arrayRandomWaves[i].frequency() - this.arrayRandomWaves[i].offset) / (2 *Math.PI));
        }
        this.currentExternalForce = force;
        return this.currentExternalForce;
    }
}

let testSignal = new Object(ExternalForce);
testSignal.GenerateRandomSignal(1, 30, 10);

$("#pausebutton").click(function() {blnPaused = !blnPaused;});

Plotly.plot('chart', [{
    y: [testSignal.GetExternalForce(0)],
    type: 'line',
    name: 'test1'
}]);


var cnt = 0;
setInterval(function () {

    if (!blnPaused) {
        //testGetConstant()
        Plotly.extendTraces('chart', { y: [[testSignal.GetExternalForce(cnt)]] }, [0]);

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

let CurrentState = {
    currentTime: 0,
    currentPostion: 0
}

let Controller = {
    tuneP: 0,
    tuneI: 0,
    tuneD: 0,
    maxForceMagnitude: 0,
    currentOutputForce: 0,
    GetNewOutput: function(timeInterval, currentPosition, externalForce, input) {       
        // update currentOutputForce
    }
}

let Model = {
    mass: 0,
    GetNewState: function(timeInterval, externalForce, internalForce) {

    }
}

function testGetConstant() {
    return 3;
}

