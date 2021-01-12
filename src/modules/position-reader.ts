import { from } from "rxjs";
import { flatMap, map } from "rxjs/operators";
import { Vector3 } from "@babylonjs/core";

/**
 * 
 * @param line 
 */
export function vector3(offset: number) {
    return map((data: number[]) => new Vector3(data[offset], data[offset + 2], data[offset + 1]));
}

/**
 * 
 */
export function csv() {
    return map((line: string) => line.split(',').map(parseFloat));
}

/**
 * 
 */
export function lines() {
    return flatMap((text: string) => from(text.split(/\r\n|\n/)))
}
