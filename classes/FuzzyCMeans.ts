import { IMatrixRow } from "../interfaces";
import { pseudoRandomBytes } from "crypto";
import { Person } from "./Person";
import Decimal from 'decimal.js';
import { ClusterCenter } from "./ClusterCenter";

export class FuzzyCMeans {
    private static ZERO = new Decimal(0);
    private static ONE = new Decimal(1);

    private _mat: IMatrixRow[]; // U/u
    private _groupNum: number;
    private _objectiveValue: Decimal; // J
    private _mass: number; // m
    private _clusterCenter: ClusterCenter[]; // C/c

    get partitionMatrix(): IMatrixRow[] {
        return this._mat;
    }

    get groupNum(): number {
        return this._groupNum;
    }

    get objectiveValue(): Decimal {
        return this._objectiveValue;
    }

    get mass(): number {
        return this._mass;
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

    private distance(leftVector: Decimal[], rightVector: Decimal[]): Decimal {
        if (leftVector.length === rightVector.length) {
            return Decimal.sqrt(leftVector.map((v, i) => Decimal.pow(v.minus(rightVector[i]), 2)).reduce((p, c) => p.plus(c)));
        } else {
            throw new Error(`Vector size is not equal: left => ${leftVector.length}, right => ${rightVector.length}`);
        }
    }

    public constructor(population: Person[], groupNum: number) {
        this._groupNum = groupNum;
        this._mat = population.map(p => ({ person: p, vector: this.generateRandomUniformVector(this._groupNum) }));
        this._mass = 2;
        this._clusterCenter = new Array<ClusterCenter>(this._groupNum);
        this._objectiveValue = FuzzyCMeans.ZERO;
    }

    public formGroup(maxIteration: number, minImprovement: Decimal, mass: number = 2) {
        if (minImprovement.greaterThan(FuzzyCMeans.ZERO) && minImprovement.lessThan(FuzzyCMeans.ONE)) {
            if (mass > 1) {
                this._mass = mass;

                let stop = false;
                let iteration = 1;
                while (iteration <= maxIteration && !stop) {
                    // 2.a.
                    this._clusterCenter = this._clusterCenter.map((_v, i) => {
                        let sumUPowered = this._mat.map(row => row.vector[i].pow(this._mass)).reduce((p, c) => p.plus(c));
                        let clusterCenterVector = this._mat
                            .map(row => row.person.toVector().map(v => v.times(row.vector[i].pow(this._mass))))
                            .reduce((p, c) => p === null ? c : p.map((v, i) => v.plus(c[i])), null)
                            .map(v => v.div(sumUPowered));
                        return new ClusterCenter(i + 1, clusterCenterVector);
                    });
                    // 2.b.
                    let distanceMatrix = this._clusterCenter
                        .map(center => this._mat
                            .map(row => this.distance(center.vector, row.person.toVector()))
                        );
                    // 2.c.
                    for (let i = 0; i < this._mat.length; i++) {
                        for (let j = 0; j < this._mat[i].vector.length; j++) {
                            this._mat[i].vector[j] = (distanceMatrix[i][j].pow(new Decimal(-2).div(this._mass - 1))).div(distanceMatrix.map(row => row[j]).reduce((p, c) => p.plus(c)));
                        }
                    }
                    // 2.d.
                    let objectiveValue = this._mat
                        .map((row, i) => this._clusterCenter
                            .map((center, j) => row
                                .vector[j]
                                .pow(this._mass)
                                .mul(this.distance(center.vector, row.person.toVector()))
                            )
                        ).reduce((p, c) => p === null ? c : p.map((v, i) => v.plus(c[i])), null)
                            .reduce((p, c) => p.plus(c));
                    // 2.e.
                    if (Decimal.abs(objectiveValue.minus(this._objectiveValue)).lessThan(minImprovement)) {
                        stop = true;
                    } else {
                        this._objectiveValue = objectiveValue;
                        iteration += 1;
                    }
                }

            } else {
                throw new Error('Mass must be greater than 1');
            }
        } else {
            throw new Error('Minimum improvement must be greater than 0 and lower than 1');
        }
    }
}
