var blnPaused = false;
var displayTimeSec = 15;
var screenUpdateIntervalMilliSec = 20;
var displayPoints = displayTimeSec * 1000 / screenUpdateIntervalMilliSec;

var desiredPIDPollingRate = 50;
var usePIDIntervalMilliSec = screenUpdateIntervalMilliSec //= getPIDPollingRate();

$("#pausebutton").click(function() {blnPaused = !blnPaused;});

function testGetConstant() {
    return 3;
}

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
    waveComponents: 12,
    arrayRandomWaves: [],

    GenerateRandomSignal: function(minPeriod, maxPeriod, maxAmplitude) {
        
        for(i=0; i<this.waveComponents; i++) {
            //consider restricting wave frequencies as a function of amplitude
            var waveComponent = Object.create(Wave);
            waveComponent.amplitude = (maxAmplitude / Math.sqrt(this.waveComponents)) * Math.random();
            waveComponent.period = ((maxPeriod - minPeriod) * Math.random() + minPeriod) * screenUpdateIntervalMilliSec / 1000;
            waveComponent.offset = Math.random() * maxPeriod;
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

var testSignal = new Object(ExternalForce);
testSignal.GenerateRandomSignal(.5, 30, 10);

let Model = {
    mass: 0,
    GetNewState: function(timeInterval, state, externalForce, internalForce) {
        state.currentTime += timeInterval;
        state.currentVelocity += (0.5) * ((externalForce + internalForce) / this.mass) * timeInterval;
        state.currentPosition += state.currentVelocity * timeInterval;
    }
}
var model = new Object(Model);
model.mass = 1;

let CurrentState = {
    currentTime: 0,
    currentPosition: 0,
    currentVelocity: 0,
    getCurrentPosition: function() {
        //return Math.random() * 5;
        return this.currentPosition;
    }
}
var state = new Object(CurrentState);

let Controller = {
    tuneP: 0,
    tuneI: 0,
    tuneD: 0,
    maxForceMagnitude: 0,
    currentOutputForce: 0,
    currentIntegralError: 0,
    GetNewOutput: function(timeInterval, currentVelocity, currentPosition, input) {       
        
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

var control = new Object(Controller);
control.tuneP = 10000;
control.tuneI = 10;
control.tuneD = 3000;
control.maxForceMagnitude = 20;

Plotly.plot('chartForces', [
    {   x: [iterationToTime(0)],  
        y: [testSignal.GetExternalForce(0)],
        type: 'line',
        name: 'External Force'},           
    {   x: [iterationToTime(0)],  
        y: [state.getCurrentPosition()],
        type: 'line',
        name: 'Controller Force'}
]);

Plotly.plot('chartPositioning', [
    {   x: [iterationToTime(0)],
        y: [control.currentOutputForce],
        type: 'line',
        name: 'Desired Position'},        
    {   x: [iterationToTime(0)],
        y: [iterationToTime(0)],
        type: 'line',
        name: 'Actual Position'}
]);

var cnt = 0;
setInterval(function () {

    if (!blnPaused) {

        var currentTime = iterationToTime(cnt);
        var forceExternal = testSignal.GetExternalForce(currentTime)
        model.GetNewState(screenUpdateIntervalMilliSec / 1000, state, forceExternal, control.currentOutputForce);

        Plotly.extendTraces('chartForces', { y: [[forceExternal], [control.currentOutputForce]],
                                             x: [[currentTime], [currentTime]] }, [0, 1]);

        Plotly.extendTraces('chartPositioning', { y: [[getInput(currentTime)], [state.currentPosition]],
                                                  x: [[currentTime], [currentTime]]}, [0, 1]);

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
    Math.floor(1000/desiredPIDPollingRate) // rate that is desired.
    return Math.max(1, Math.floor(screenUpdateIntervalMilliSec / (Math.floor(1000/desiredPIDPollingRate))));
}

function getInput(time) {
    var multiplier = 1;
    if (Math.floor(time / 5) % 2 > 0) { multiplier = -1; }

    return 3 * multiplier
}

function iterationToTime(iteration) {
    return usePIDIntervalMilliSec * iteration / 1000;
}

