import { IMatrixRow } from "../interfaces";
import { pseudoRandomBytes } from "crypto";
import { Person } from "./Person";
import Decimal from 'decimal.js';

export class FuzzyCMeans {
    private _mat: IMatrixRow[];

    get partitionMatrix(): IMatrixRow[] {
        return this._mat;
    }

    private generateRandomUniformVector(length: number): Decimal[] {
        let vector: Decimal[] = new Array<Decimal>();
        let sum: Decimal = new Decimal(0);
        pseudoRandomBytes(length).forEach(v => {
            vector.push(new Decimal(v));
            sum = sum.plus(new Decimal(v));
        });
        return vector.map(v => v.div(sum));
    }

    public constructor(population: Person[], groupNum: number) {
        this._mat = population.map(p => ({ person: p, vector: this.generateRandomUniformVector(groupNum) }));
    }
}
