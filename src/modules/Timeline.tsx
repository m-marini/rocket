import { Vector3 } from "@babylonjs/core";
import _ from 'lodash';

const SampleInterval = 0.25;
const AlertDuration = 5;
const Flying = 0;

export interface Status {
    position: Vector3;
    speed: Vector3;
    fuel: number;
    status: number;
}

interface Episode {
    from: number;
    to: number;
    begin: number;
    end: number;
}

/**
 * 
 * @param p0 
 * @param p1 
 * @param alpha 
 * @returns 
 */
function interpolateV3(p0: Vector3, p1: Vector3, alpha: number) {
    const p01 = p1.subtract(p0);
    const p = p01.scale(alpha).add(p0);
    return p;
}

/**
 * 
 */
export class Timeline {
    private _path: Status[];
    private _episodes: Episode[];

    constructor(path: Status[], episodes: Episode[]) {
        this._path = path;
        this._episodes = episodes;
    }

    get sampleInterval() { return SampleInterval; }

    get path() { return this._path; }

    /**
     * 
     * @param t 
     * @returns 
     */
    status(t: number): Status {
        const interval = this.interval(t);
        return !interval
            ? {
                position: Vector3.Zero(),
                speed: Vector3.Zero(),
                fuel: 0,
                status: 0,
            }
            : {
                position: interpolateV3(interval.from.position, interval.to.position, interval.alpha),
                speed: interpolateV3(interval.from.speed, interval.to.speed, interval.alpha),
                fuel: (interval.to.fuel - interval.from.fuel) * interval.alpha + interval.from.fuel,
                status: interval.from.status
            };
    }


    /**
     * 
     * @param t 
     * @returns
     */
    private interval(t: number) {
        if (t < 0) {
        }
        const { path, _episodes: episodes } = this;
        if (episodes.length === 0) {
            return undefined;
        }
        const n = path.length;
        const episode = episodes.find(e => t >= e.begin && t < e.end)
            || episodes[episodes.length - 1];
        if (!episode) {
            return { from: path[n - 1], to: path[n - 1], alpha: 0 };
        }
        const dt = t - episode.begin;
        const j = Math.floor(dt / SampleInterval);
        const idx = Math.min(episode.from + j, episode.to);
        return idx === episode.to
            ? { from: path[idx], to: path[idx], alpha: 0 }
            : { from: path[idx], to: path[idx + 1], alpha: (dt - j * SampleInterval) / SampleInterval };
    }
}

/**
 * 
 * @param status 
 * @returns 
 */
export function createTimeline(status: Status[]) {
    const n = status.length;
    const ends = _(status)
        .map((status, i) => { return { status, i }; })
        .filter(item => item.status.status !== Flying)
        .map('i')
        .value();
    const pts = (status[n - 1].status !== Flying)
        ? _.concat([0], ends)
        : _.concat([0], ends, [n - 1]);
    const m = pts.length;
    const episodes = _.zip(_.take(pts, m - 1), _.drop(pts, 1)).map((ary, i) => {
        const from = ary[0] || 0;
        const to = ary[1] || 0;
        const begin = from * SampleInterval + i * AlertDuration;
        const end = to * SampleInterval + (i + 1) * AlertDuration;
        return { from, to, begin, end };
    });

    return new Timeline(status, episodes);
}
