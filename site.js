var blnPaused = false;
var displayTimeSec = 15;
var screenUpdateIntervalMilliSec = 20;
var displayPoints = displayTimeSec * 1000 / screenUpdateIntervalMilliSec;

var valuesDefaulted = false;
var desiredPIDPollingRate = 50;
var usePIDIntervalMilliSec = screenUpdateIntervalMilliSec //= getPIDPollingRate();

// Objects types to be used
let Wave = {
    period: 0,
    amplitude: 0,
    offset: 0,
    xaxis: 'time (s)',
    frequency: function () {
        return 1 / this.period;
    }
}

let ExternalForce = {
    currentExternalForce: 0,
    approximateMaxAmplitude: 0,
    waveComponents: 12,
    arrayRandomWaves: [],

    GenerateRandomSignal: function (minPeriod, maxPeriod, maxAmplitude) {

        for (i = 0; i < this.waveComponents; i++) {
            //consider restricting wave frequencies as a function of amplitude
            var waveComponent = Object.create(Wave);
            waveComponent.amplitude = (maxAmplitude / Math.sqrt(this.waveComponents)) * Math.random() / 10;
            waveComponent.period = ((maxPeriod - minPeriod) * Math.random() + minPeriod) * screenUpdateIntervalMilliSec / 1000;
            waveComponent.offset = Math.random() * maxPeriod;
            this.arrayRandomWaves.push(waveComponent);
        }
    },

    GetExternalForce: function (time) {

        // update currentExternalForce
        var force = 0;
        for (i = 0; i < this.arrayRandomWaves.length; i++) {
            force += this.arrayRandomWaves[i].amplitude * Math.sin((time * this.arrayRandomWaves[i].frequency() - this.arrayRandomWaves[i].offset) / (2 * Math.PI));
        }
        this.currentExternalForce = this.approximateMaxAmplitude * force;
        return this.currentExternalForce;
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

let Input = {
    mode: '',
    amplitude: 0,
    frequency: 0,
    manualvalue: 0,
    currentinput: 0,
    GetInput: function (time) {

        switch (this.mode.toLowerCase()) {
            case "sinwave":
                this.currentinput = this.amplitude * Math.sin(time * 2 * Math.PI / this.frequency);
                break;

            case "squarewave":
                this.currentinput = this.amplitude * Math.sign(Math.sin(time * 2 * Math.PI / this.frequency));
                break;

            case "trianglewave":
                throw console.error("Unsupported input mode!");
                break;

            case "manual":
                this.currentinput = this.manualvalue;
                break;

            default: throw console.error("Unsupported input mode!");
        }
        return this.currentinput;
    }
}

// Initialize the objects we'll be using
var testSignal = new Object(ExternalForce);
var model = new Object(Model);
var state = new Object(CurrentState);
var control = new Object(Controller);
var input = new Object(Input);

setEvents();

var positionLayout = {
    height: 250,
    margin: { l: 60, r: 10, b: 20, t: 10, pad: 4 },
    xaxis: {
        title: 'Time (seconds)',
        titlefont: { color: '#7f7f7f' }
    },
    yaxis: {
        title: 'Position (meters)',
        titlefont: { color: '#7f7f7f' }
    }
};

Plotly.plot('chartPositioning', [
    {
        x: [],
        y: [],
        type: 'line',
        name: 'Desired Position',
        marker: { color: 'rgb(0, 204, 0)' }
    },
    {
        x: [],
        y: [],
        type: 'line',
        name: 'Actual Position',
    },
    {
        x: [],
        y: [],
        type: 'line',
        name: 'Error',
        marker: { color: 'rgb(255, 0, 0)' }
    }
], positionLayout);

var forceLayout = jQuery.extend(true, {}, positionLayout)
forceLayout.yaxis.title = "Force (Newtons)"

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
        name: 'Controller Force',
        marker: { color: 'rgb(102, 0, 102)' }
    }], forceLayout
);

// Default values here. we won't redo this on a reset
testSignal.GenerateRandomSignal(.5, 30, 10);

// Callback function to be evaluated repeatedly
var cnt = 0;
setInterval(function () {

    if (!valuesDefaulted) {

        // System Defaulting
        testSignal.approximateMaxAmplitude = 10;
        $('#maxExternalForce').val(10);

        model.mass = 1;
        $('#mass').val(1);

        // Controller Defaulting
        DefaultControllerValues(control);

        // Input Defaulting
        DefaultInput(input);

        setInputDisabled(input.mode);

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
            y: [[input.GetInput(currentTime)], [state.currentPosition], [state.currentPosition - input.GetInput(currentTime)]],
            x: [[currentTime], [currentTime], [currentTime]]
        }, [0, 1, 2]);

        cnt++;
        if (iterationToTime(cnt) > displayTimeSec) {
            Plotly.relayout('chartForces', { xaxis: { range: [currentTime - displayTimeSec, currentTime] } });
            Plotly.relayout('chartPositioning', { xaxis: { range: [currentTime - displayTimeSec, currentTime] } });
        };

        control.GetNewOutput(screenUpdateIntervalMilliSec / 1000, state.currentVelocity, state.currentPosition, input.GetInput(currentTime)) // set input
    };
}, screenUpdateIntervalMilliSec);

function setEvents() {
    $("#pausebutton").click(function () { blnPaused = !blnPaused; });
    $("#reset").click(function () { valuesDefaulted = false; });

    $('#maxExternalForce').change(function () { testSignal.approximateMaxAmplitude = Math.abs($('#maxExternalForce').val()); });
    $('#mass').change(function () { model.mass = Math.abs($('#mass').val()); });
    $('#noise').attr('disabled', 'disabled');
    
    $('#gainP').change(function () { control.tuneP = Math.abs($('#gainP').val()); });
    $('#gainI').change(function () { control.tuneI = Math.abs($('#gainI').val()); });
    $('#gainD').change(function () { control.tuneD = Math.abs($('#gainD').val()); });
    $('#maxControlForce').change(function () { control.maxForceMagnitude = Math.abs($('#maxControlForce').val()); });
    
    $('#inputmode').change(function () {
        input.mode = $('#inputmode').val();
        setInputDisabled($('#inputmode').val());
    });
    $('#inputfrequency').change(function () { input.frequency = Math.abs($('#inputfrequency').val()); });
    $('#inputamplitude').change(function () { input.amplitude = Math.abs($('#inputamplitude').val()); });
    $('#inputmanual').change(function () { input.manualvalue = Math.abs($('#inputmanual').val()); });
}

function DefaultControllerValues(control) {

    control.tuneP = 10000;
    $('#gainP').val(10000);

    control.tuneI = 10;
    $('#gainI').val(10);

    control.tuneD = 3500;
    $('#gainD').val(3500);

    control.maxForceMagnitude = 20;
    $('#maxControlForce').val(20);

    control.currentIntegralError = 0;
}

function DefaultInput(input) {
    input.mode = "squarewave";
    $('#inputmode').val("squarewave");

    input.frequency = 10;
    $('#inputfrequency').val(10);

    input.amplitude = 5;
    $('#inputamplitude').val(5);

    input.manualvalue = 0;
    $('#inputmanual').val(5);
}

function setInputDisabled(inputmode) {


    switch (inputmode.toLowerCase()) {
        // case iwth multiple values not working?
        case "squarewave":
            $('#inputfrequency').prop('disabled', false);
            $('#inputamplitude').prop('disabled', false);
            $('#inputmanual').prop('disabled', true);
            break;

        case "sinwave":
            $('#inputfrequency').prop('disabled', false);
            $('#inputamplitude').prop('disabled', false);
            $('#inputmanual').prop('disabled', true);
            break;

        case "trianglewave":
            $('#inputfrequency').prop('disabled', false);
            $('#inputamplitude').prop('disabled', false);
            $('#inputmanual').prop('disabled', true);
            break;

        case "manual":
            $('#inputmanual').prop('disabled', false);
            $('#inputfrequency').prop('disabled', true);
            $('#inputamplitude').prop('disabled', true);
            break;
    }
}

function iterationToTime(iteration) {
    return usePIDIntervalMilliSec * iteration / 1000;
}
