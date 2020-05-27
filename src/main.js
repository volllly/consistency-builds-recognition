import Tone from 'tone';

class Queue {
  tasks = [];
  running = false;

  push(task, run = true) {
    return this.queue(task, 1, run);
  }

  unshift(task, run = true) {
    return this.queue(task, -1, run);
  }

  async queue(task, direction, run = true) {
    return new Promise((resolve, reject) => {
      let promise = {
        resolve,
        reject
      };

      if(direction >= 0) {
        this.tasks.push({
          task,
          promise
        });
      } else {
        this.tasks.unshift({
          task,
          promise
        });
      }
  
      if(!this.running) {
        if(run) {
          this.run();
        }
      }
    });
  }

  async run() {
    if(!this.running) {
      this.running = true;
      while(this.tasks.length) {
        let task = this.tasks.shift(0);

        try {
          let response = await Promise.resolve(task.task());

          task.promise.resolve(response);
        } catch(e) {
          task.promise.reject(e);
        }
      }

      this.running = false;
    }
  }
}

function setRandomInterval(f, min, max) {
  let stopped = false;

  (async () => {
    while(!stopped) {
      await new Promise(resolve => {
        setTimeout(() => {
          f();
          resolve()
        }, (min + gaussian() * (max - min)) * 1000)
      });
    }
  })();

  return { stop: () => stopped = true };
}

function gaussian() {
  return (Math.random() + Math.random() + Math.random()) / 3;
}

export default class Cbr {
  init = undefined;

  constructor() {
    this.queue = new Queue();

    this.init = this.queue.push(async () => {
      console.debug('init started');

      const spray = .1;
      const frequency = 2;
      const grains = 10;
      const speed = 0.8;

      this.reverbs = {
        r: new Tone.Reverb(10),
        j: new Tone.Reverb(5),
      };

      this.reverbs.r.generate();
      this.reverbs.j.generate();
      Tone.Master.chain(this.reverbs.r);

      this.players = await Promise.all([...Array(grains).keys()].map(() => new Promise((resolve, reject) => {
        let grainplayer = new Tone.GrainPlayer('../assets/consistency-builds-recognition-long.wav', () => resolve(grainplayer));

        let volume = new Tone.Volume(-20 + gaussian() * 5);
        grainplayer.connect(volume),
        volume.toMaster();
      })));
      
      console.debug('sample loaded');

      let time = Date.now() - 4000;
      let currentspeed = speed;

      setInterval(() => {
        // console.log(currentspeed);
        time = time + 100 * currentspeed * (gaussian() * 0.1 + 0.95);
      }, 50);

      setInterval(() => {
        let r = speed * Math.random() * 1.5;
        currentspeed = currentspeed + r * (currentspeed + speed / 4 > speed ? (-1) : 1);
      }, 4100);

      setInterval(() => {
        let r = speed * Math.random() / 5;
        currentspeed = currentspeed + r * (currentspeed > speed ? (-1) : 1);
      }, 900);

      this.players.forEach(g => {
        let start = Date.now();
        setRandomInterval(() => {
          g.detune = (gaussian() - .5) / 2;
          g.grainSize = speed / frequency * gaussian() * 2;
          g.fadeIn = g.grainSize / 3;
          g.fadeOut = g.grainSize / 2;
          g.stop();
          g.start(`+${gaussian() * spray - spray / 2}`, (time - start) / 1000 * speed + gaussian() * spray - spray / 2, g.grainSize);
        }, g.grainSize + g.grainSize, g.grainSize + (1 / frequency));
      });
    }, false);
  }

  resume = () => {
    this.queue.unshift(() => { Tone.context.resume() });
  };
}
