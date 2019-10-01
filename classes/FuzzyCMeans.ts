import { IMember } from "../interfaces";
import { pseudoRandomBytes } from "crypto";
import { Person } from "./Person";
import Decimal from 'decimal.js';
import { ClusterCenter } from "./ClusterCenter";
import { Group } from "./Group";

/**
 * Fuzzy C Means (FCM) model.
 */
export class FuzzyCMeans {
    private static ZERO = new Decimal(0);
    private static ONE = new Decimal(1);

    private _mat: IMember[]; // U/u
    private _groupNum: number;
    private _objectiveValue: Decimal; // J
    private _mass: number; // m
    private _clusterCenter: ClusterCenter[]; // C/c

    /**
     * Get current partition matrix.
     */
    get partitionMatrix(): IMember[] {
        return this._mat;
    }

    /**
     * Get number of groups modelled by this FCM model.
     */
    get groupNum(): number {
        return this._groupNum;
    }

    /**
     * Get current objective value (J) from last iteration.
     */
    get objectiveValue(): Decimal {
        return this._objectiveValue;
    }

    /**
     * Get masses (m) set for this FCM model.
     */
    get mass(): number {
        return this._mass;
    }

    /**
     * Generate randomly-uniform Vector (sum of all elements in vector are 1.0).
     * @param length    Vector length.
     * @returns         Random vector.
     */
    private generateRandomUniformVector(length: number): Decimal[] {
        let vector: Decimal[] = new Array<Decimal>();
        let sum: Decimal = new Decimal(0);
        pseudoRandomBytes(length).forEach(v => {
            vector.push(new Decimal(v));
            sum = sum.plus(new Decimal(v));
        });
        return vector.map(v => v.div(sum));
    }

    /**
     * Calculate distance between two vector.
     * @param leftVector    Left Vector.
     * @param rightVector   Right Vector.
     * @returns             Distance in decimal.
     * @throws              Error if vector length is different.
     */
    private distance(leftVector: Decimal[], rightVector: Decimal[]): Decimal {
        if (leftVector.length === rightVector.length) {
            return Decimal.sqrt(leftVector.map((v, i) => Decimal.pow(v.minus(rightVector[i]), 2)).reduce((p, c) => p.plus(c)));
        } else {
            throw new Error(`Vector size is not equal: left => ${leftVector.length}, right => ${rightVector.length}`);
        }
    }

    /**
     * Construct a new FCM Model.
     * @param population        The population to process.
     * @param groupNum          Number of desired groups.
     * @param initialVectors    Initial vector (if set). Set null to use randomly-uniform vector.
     */
    public constructor(population: Person[], groupNum: number, initialVectors: Decimal[][] = null) {
        this._groupNum = groupNum;
        this._mat = population.map((p, i) => ({ person: p, vector: initialVectors && initialVectors[i] ? initialVectors[i] : this.generateRandomUniformVector(this._groupNum) }));
        this._mass = 2;
        this._clusterCenter = new Array<ClusterCenter>(this._groupNum);
        this._objectiveValue = FuzzyCMeans.ZERO;
    }

    /**
     * Build FCM model.
     * @param maxIteration      Maximmum iteration that this FCM should run.
     * @param minImprovement    Minimum improvement to stop this FCM.
     * @param mass              Mass (m) to be used. Default to 2.
     * @throws                  Error if mass is less than 2.
     * @throws                  Error if minimum improvement value is less than or equal to 0 or greater than or equal to 1.
     */
    public buildModel(maxIteration: number, minImprovement: Decimal, mass: number = 2) {
        if (minImprovement.greaterThan(FuzzyCMeans.ZERO) && minImprovement.lessThan(FuzzyCMeans.ONE)) {
            if (mass > 1) {
                this._mass = mass;

                let stop = false;
                let iteration = 1;
                while (iteration <= maxIteration && !stop) {
                    // 2.a.
                    for (let i = 0; i < this._clusterCenter.length; i++) {
                        let sumUPowered = this._mat.map(row => row.vector[i].pow(this._mass)).reduce((p, c) => p.plus(c));
                        let clusterCenterVector = this._mat
                            .map(row => row.person.toVector().map(v => v.times(row.vector[i].pow(this._mass))))
                            .reduce((p, c) => p === null ? c : p.map((v, i) => v.plus(c[i])), null)
                            .map(v => v.div(sumUPowered));
                        this._clusterCenter[i] = new ClusterCenter(i + 1, clusterCenterVector);
                    }
                    // 2.b.
                    let distanceMatrix = this._clusterCenter
                        .map(center => this._mat
                            .map(row => this.distance(center.vector, row.person.toVector()))
                    );
                    // 2.c.
                    for (let i = 0; i < this._mat.length; i++) {
                        for (let j = 0; j < this._mat[i].vector.length; j++) {
                            this._mat[i].vector[j] = (distanceMatrix[j][i].pow(new Decimal(-2).div(this._mass - 1))).div(distanceMatrix.map(row => row[j]).reduce((p, c) => p.plus(c)));
                        }
                    }
                    // Extension: ensure all values inside partition matrix U are [0, 1]
                    /*
                     * Flow:
                     * For every row in partition matrix do
                     *  sumInVector = sum of all dimension in vector
                     *  For every dimension in row.vector do
                     *      set dimension = dimension / sumInVector
                     *  End
                     * End
                     */
                    this._mat = this._mat.map(row => {
                        let sumInVector = row.vector.reduce((p, c) => p.plus(c));
                        let flattedVector = row.vector.map(val => val.div(sumInVector));
                        row.vector = flattedVector;
                        return row;
                    });
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
                    console.log(`Iteration ${iteration.toString().padStart(8)} of ${maxIteration.toString().padStart(8)} (Min Improvement: ${minImprovement}):`, { prev: this._objectiveValue, new: objectiveValue, improvement: Decimal.abs(objectiveValue.minus(this._objectiveValue)) });
                }
                console.log('Iteration Stopped!');

            } else {
                throw new Error('Mass must be greater than 1');
            }
        } else {
            throw new Error('Minimum improvement must be greater than 0 and lower than 1');
        }
    }

    /**
     * Initiate group from current model.
     */
    public formGroups(): Group[] {
        let composedGroups = this._clusterCenter.map(center => new Group(center.id, center.vector)).sort((a, b) => a.id - b.id);

        // FCM mode
        this._mat.forEach(row => {
            let selectedGroupId: number = 0;
            let maxValue: Decimal = FuzzyCMeans.ZERO;
            row.vector.forEach((v, i) => {
                if (maxValue.lessThan(v)) {
                    maxValue = v;
                    selectedGroupId = i + 1;
                }
            });
            let selectedGroup = composedGroups.find(group => group.id === selectedGroupId);
            if (selectedGroup) {
                selectedGroup.members.push(row);
            } else {
                console.error(`Orphan member detected (selectedGroupId: ${selectedGroupId}, availableGroupId: ${composedGroups.map(g => g.id).join()}):`, row);
            }
        });

        // FCM Optimization - two stage operation
        const minimumGroupMember = Math.floor(this._mat.length / this._groupNum);
        const maximumGroupMember = Math.ceil(this._mat.length / this._groupNum);
        // Stage 1 => Sort each member in each group by its value ascending
        composedGroups.forEach((group, index) => {
            group.members = group.members.sort((a, b) => a.vector[index].minus(b.vector[index]).toNumber());
        });
        // Stage 2 => Try to distribute members
        for (let i = 0; i < composedGroups.length; i++) {
            while (composedGroups[i].members.length > maximumGroupMember) {
                let theoriticallyPossibleGroupOrder = composedGroups[i].members[0].vector
                    .map((val, idx) => ({ val, idx }))
                    .sort((a, b) => b.val.minus(a.val).toNumber()).filter(v => v.idx !== i)
                    .map(v => v.idx);
                let realPossibleGroupOrder = theoriticallyPossibleGroupOrder
                    .filter(idx => composedGroups[idx].members.length < minimumGroupMember || (composedGroups.every(group => group.members.length === minimumGroupMember) && composedGroups[idx].members.length < maximumGroupMember));
                // Unsafe-trivial: realPossibleGroupOrder theoritically may have no solution, but this was never had a true proof in real life. So here we try to move the lowest-probability member to first group pointed by first realPossibleGroupOrder
                composedGroups[realPossibleGroupOrder[0]].members.push(composedGroups[i].members.shift());
            }
        }
        return composedGroups;
    }

    /**
     * [DEBUG ONLY] Print formatted partition matrix
     */
    public showPartitionMatrix() {
        const memberFunction = (member: IMember): string => {
            let maxId = 0;
            let maxValue = FuzzyCMeans.ZERO;
            member.vector.forEach((v, i) => {
                if (maxValue.lessThan(v)) {
                    maxValue = v;
                    maxId = i;
                }
            });
            return [member.person.id.toString().padStart(2).padEnd(8), member.vector.map((v, i) => i === maxId ? `[ ${v.toString()} ]`.padEnd(32) : v.toString().padEnd(32)).join(' ')].join(' ');
        };
        console.log('Partition Matrix', this._mat.map(row => memberFunction(row)));
    }
}
