var blnPaused = false;
var displayTimeSec = 15;
var screenUpdateIntervalMilliSec = 20;
var displayPoints = displayTimeSec * 1000 / screenUpdateIntervalMilliSec;

var valuesDefaulted = false;
var randomForceOn = true;
var desiredPIDPollingRate = 50;
var usePIDIntervalMilliSec = screenUpdateIntervalMilliSec //= getPIDPollingRate();

// Add our events.
// Note that this is not truly event driven as we have a fast polling object already.
// We will simply update our global value and allow the polling to pull the updated value.
$("#pausebutton").click(function () { blnPaused = !blnPaused; });
$("#reset").click(function () { valuesDefaulted = false; });

$('#externalforce').change(function () {
    randomForceOn = this.checked
});


// Objects types to be used
let Wave = {
    period: 0,
    amplitude: 0,
    offset: 0,
    frequency: function () {
        return 1 / this.period;
    }
}

let ExternalForce = {
    currentExternalForce: 0,
    waveComponents: 12,
    arrayRandomWaves: [],

    GenerateRandomSignal: function (minPeriod, maxPeriod, maxAmplitude) {

        for (i = 0; i < this.waveComponents; i++) {
            //consider restricting wave frequencies as a function of amplitude
            var waveComponent = Object.create(Wave);
            waveComponent.amplitude = (maxAmplitude / Math.sqrt(this.waveComponents)) * Math.random();
            waveComponent.period = ((maxPeriod - minPeriod) * Math.random() + minPeriod) * screenUpdateIntervalMilliSec / 1000;
            waveComponent.offset = Math.random() * maxPeriod;
            this.arrayRandomWaves.push(waveComponent)
        }
    },

    GetExternalForce: function (time) {

        if (randomForceOn) {

            // update currentExternalForce
            var force = 0;
            for (i = 0; i < this.arrayRandomWaves.length; i++) {
                force += this.arrayRandomWaves[i].amplitude * Math.sin((time * this.arrayRandomWaves[i].frequency() - this.arrayRandomWaves[i].offset) / (2 * Math.PI));
            }
            this.currentExternalForce = force;
            return this.currentExternalForce;

        } else {
            this.currentExternalForce = 0;
            return this.currentExternalForce;
        }
    }
}

let Model = {
    mass: 0,
    GetNewState: function (timeInterval, state, externalForce, internalForce) {
        state.currentTime += timeInterval;
        state.currentVelocity += (0.5) * ((externalForce + internalForce) / this.mass) * timeInterval;
        state.currentPosition += state.currentVelocity * timeInterval;
    }
}

let CurrentState = {
    currentTime: 0,
    currentPosition: 0,
    currentVelocity: 0,
    getCurrentPosition: function () {
        //return Math.random() * 5;
        return this.currentPosition;
    }
}

let Controller = {
    tuneP: 0,
    tuneI: 0,
    tuneD: 0,
    maxForceMagnitude: 0,
    currentOutputForce: 0,
    currentIntegralError: 0,
    GetNewOutput: function (timeInterval, currentVelocity, currentPosition, input) {

        var PComponent = ((input - currentPosition) * this.tuneP * timeInterval)

        this.currentIntegralError += (timeInterval * (input - currentPosition));
        var IComponent = this.currentIntegralError * this.tuneI;

        var DComponent = (currentVelocity * this.tuneD * timeInterval * (-1));

        var ControllerPreferred = PComponent + IComponent + DComponent;

        if (Math.abs(ControllerPreferred) < this.maxForceMagnitude) {
            this.currentOutputForce = ControllerPreferred;
        } else {
            this.currentOutputForce = Math.sign(ControllerPreferred) * this.maxForceMagnitude;
        }
    }
}

// Initialize the objects we'll be using
var testSignal = new Object(ExternalForce);
var model = new Object(Model);
var state = new Object(CurrentState);
var control = new Object(Controller);

$('#maxExternalForce').change(function () {
    control.maxForceMagnitude = Math.abs($('#maxExternalForce').val());
});

var layout = {
    height: 230,
    //width: 100,
    margin: {
        l: 60,
        r: 10,
        b: 0,
        t: 10,
        pad: 4
    }
};

Plotly.plot('chartPositioning', [
    {
        x: [iterationToTime(0)],
        y: [0],
        type: 'line',
        name: 'Desired Position',
        xaxis: 'test'
    },
    {
        x: [0],
        y: [iterationToTime(0)],
        type: 'line',
        name: 'Actual Position'
    },
    {
        x: [0],
        y: [iterationToTime(0)],
        type: 'line',
        name: 'Error'
    }
], layout);

// Start our plots
Plotly.plot('chartForces', [
    {
        x: [iterationToTime(0)],
        y: [0],
        type: 'line',
        name: 'External Force'
    },
    {
        x: [iterationToTime(0)],
        y: [0],
        type: 'line',
        name: 'Controller Force'
    }
], layout);

// Default values here. we won't redo this on a reset
testSignal.GenerateRandomSignal(.5, 30, 10);

// Callback function to be evaluated repeatedly
var cnt = 0;
setInterval(function () {

    if (!valuesDefaulted) {

        model.mass = 1;
        control.tuneP = 10000;
        control.tuneI = 10;
        control.tuneD = 3500;

        control.maxForceMagnitude = 20; $('#maxExternalForce').val(20);

        randomForceOn = true; $('#externalforce').val(true);

        valuesDefaulted = true;
    }

    if (!blnPaused) {

        var currentTime = iterationToTime(cnt);
        var forceExternal = testSignal.GetExternalForce(currentTime)
        model.GetNewState(screenUpdateIntervalMilliSec / 1000, state, forceExternal, control.currentOutputForce);

        Plotly.extendTraces('chartForces', {
            y: [[forceExternal], [control.currentOutputForce]],
            x: [[currentTime], [currentTime]]
        }, [0, 1]);

        Plotly.extendTraces('chartPositioning', {
            y: [[getInput(currentTime)], [state.currentPosition], [getInput(currentTime) - state.currentPosition]],
            x: [[currentTime], [currentTime], [currentTime]]
        }, [0, 1, 2]);

        cnt++;
        if (iterationToTime(cnt) > displayTimeSec) {
            Plotly.relayout('chartForces', { xaxis: { range: [currentTime - displayTimeSec, currentTime] } });
            Plotly.relayout('chartPositioning', { xaxis: { range: [currentTime - displayTimeSec, currentTime] } });
        };

        control.GetNewOutput(screenUpdateIntervalMilliSec / 1000, state.currentVelocity, state.currentPosition, getInput(currentTime)) // set input
    };
}, screenUpdateIntervalMilliSec);

function getPIDToRefreshMultiplier() {
    // Non-critical value. Here, just determine how many PID iterations we should compute before each screen refresh
    Math.floor(1000 / desiredPIDPollingRate) // rate that is desired.
    return Math.max(1, Math.floor(screenUpdateIntervalMilliSec / (Math.floor(1000 / desiredPIDPollingRate))));
}

function getInput(time) {
    var multiplier = 1;
    if (Math.floor(time / 5) % 2 > 0) { multiplier = -1; }

    return 3 * multiplier
}

function iterationToTime(iteration) {
    return usePIDIntervalMilliSec * iteration / 1000;
}

