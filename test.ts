import { IMember } from "./interfaces";
import { pseudoRandomBytes } from "crypto";
import { Person } from "./classes";
import Decimal from 'decimal.js';
import { ClusterCenter } from "./classes/ClusterCenter";
import { Group } from "./classes/Group";
import { join } from "path";
import * as csv from 'fast-csv';


/**
 * Fuzzy C Means (FCM) model.
 */
class FuzzyCMeans {
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
                            let l = distanceMatrix[j][i].pow(new Decimal(-2));
                            let actualL = (distanceMatrix[j][i].pow(new Decimal(-2).div(this._mass - 1)));
                            let sig = distanceMatrix.map(row => row[i]).reduce((p, c) => p.plus(c));
                            this._mat[i].vector[j] = (distanceMatrix[j][i].pow(new Decimal(-2).div(this._mass - 1))).div(distanceMatrix.map(row => row[i]).reduce((p, c) => p.plus(c)));
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
                    console.log(`Iteration ${iteration.toString().padStart(8)} of ${maxIteration.toString().padStart(8)} (Min Improvement: ${minImprovement}):`, { prev: this._objectiveValue, new: objectiveValue, improvement: Decimal.abs(objectiveValue.minus(this._objectiveValue)) });
                    if (Decimal.abs(objectiveValue.minus(this._objectiveValue)).lessThan(minImprovement)) {
                        stop = true;
                    } else {
                        this._objectiveValue = objectiveValue;
                        iteration += 1;
                    }
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

// Tweakable constants
const groupNum: number = 7; // Number of group you'd want to create
const maxIteration: number = 100; // Maximmum iteration that FCM should run
const minImprovement: Decimal = new Decimal(0.001); // Minimum improvement to stop FCM
const useRandomGeneratedDataset: boolean = false; // Toggle to use random dataset (true) or user-supplied dataset (false)

const population: Person[] = new Array<Person>(); // Population set (Global)
const initialVectors = [
    [0.14, 0.12, 0.05, 0.22, 0.12, 0.15, 0.2],
    [0.31, 0.14, 0.15, 0.14, 0.16, 0.05, 0.05],
    [0.19, 0.15, 0.21, 0.11, 0.11, 0.2, 0.03],
    [0.2, 0.18, 0.21, 0.1, 0.1, 0.11, 0.1],
    [0.16, 0.15, 0.1, 0.14, 0.16, 0.15, 0.14],
    [0.22, 0.2, 0.1, 0.11, 0.1, 0.15, 0.12],
    [0.2, 0.13, 0.21, 0.16, 0.13, 0.06, 0.11],
    [0.11, 0.2, 0.15, 0.2, 0.23, 0.05, 0.06],
    [0.19, 0.13, 0.15, 0.11, 0.13, 0.17, 0.12],
    [0.1, 0.12, 0.13, 0.2, 0.2, 0.13, 0.12],
    [0.2, 0.23, 0.15, 0.13, 0.2, 0.04, 0.05],
    [0.13, 0.2, 0.14, 0.1, 0.1, 0.13, 0.2],
    [0.1, 0.13, 0.15, 0.2, 0.2, 0.07, 0.15],
    [0.12, 0.15, 0.23, 0.11, 0.1, 0.17, 0.12],
    [0.3, 0.05, 0.1, 0.1, 0.1, 0.19, 0.16],
    [0.2, 0.02, 0.11, 0.2, 0.12, 0.22, 0.13],
    [0.15, 0.15, 0.11, 0.21, 0.2, 0.07, 0.11],
    [0.2, 0.15, 0.11, 0.13, 0.1, 0.16, 0.15],
    [0.11, 0.18, 0.15, 0.2, 0.21, 0.05, 0.1],
    [0.2, 0.15, 0.1, 0.13, 0.11, 0.16, 0.15],
    [0.06, 0.13, 0.21, 0.16, 0.13, 0.2, 0.11],
    [0.2, 0.14, 0.2, 0.13, 0.1, 0.13, 0.1],
    [0.11, 0.19, 0.15, 0.16, 0.13, 0.15, 0.11],
    [0.2, 0.03, 0.19, 0.12, 0.13, 0.21, 0.12],
    [0.13, 0.2, 0.15, 0.16, 0.15, 0.1, 0.11],
    [0.25, 0.2, 0.1, 0.12, 0.08, 0.15, 0.1],
    [0.3, 0.1, 0.1, 0.16, 0.19, 0.1, 0.05],
    [0.14, 0.16, 0.14, 0.05, 0.31, 0.05, 0.15],
    [0.1, 0.25, 0.2, 0.12, 0.01, 0.12, 0.2],
    [0.05, 0.12, 0.2, 0.14, 0.15, 0.22, 0.12],
    [0.15, 0.21, 0.03, 0.11, 0.2, 0.11, 0.19],
    [0.11, 0.15, 0.15, 0.1, 0.16, 0.13, 0.2],
    [0.12, 0.11, 0.22, 0.1, 0.15, 0.2, 0.1],
    [0.25, 0.2, 0.12, 0.08, 0.05, 0.1, 0.2],
    [0.15, 0.21, 0.2, 0.11, 0.07, 0.11, 0.15],
].map(row => row.map(v => new Decimal(v))); // Initial vectors / partition matrix to be used on user-supplied dataset

if (useRandomGeneratedDataset) {
    // Run FCM on random dataset mode
    const datasetSize: number = 10000; // Determin how big does the dataset
    const randomScoreFunction = (): number => (2 * Math.random() * 9) - 1; // Function to random the traits value {-9, -7, -5, -3, -1, 1, 3, 5, 7, 9}
    for (let i = 1; i <= datasetSize; i++) { // Generate random population
        population.push(new Person(i, `Person ${i}`, {
            active_reflective: randomScoreFunction(),
            sensing_intuitive: randomScoreFunction(),
            visual_verbal: randomScoreFunction(),
            sequential_global: randomScoreFunction(),
        }));
    }
    const model = new FuzzyCMeans(population, groupNum); // Generate FCM model
    //console.log('Model:', model.partitionMatrix.map(v => ({ mat: v.vector, sum: v.vector.reduce((p, c) => p.add(c), new Decimal(0)) })));
    model.buildModel(maxIteration, minImprovement); // Build model
    //model.showPartitionMatrix();
    let groups = model.formGroups(); // Form groups from model
    console.log('Generated groups:', groups.map(group => ({
        id: group.id,
        centerVector: group.centerVector,
        members: group.members.map(member => member.person.name),
    })));
} else {
    csv.parseFile(join(__dirname, 'dataset.csv'), { headers: true, objectMode: true }) // Read dataset.csv
        .on('error', error => console.error(error))
        .on('data', row => population.push(new Person(row['Num'], row['Name'], { // Push each row to population
            active_reflective: row['Active_Reflective'],
            sensing_intuitive: row['Sensing_Intuitive'],
            visual_verbal: row['Visual_Verbal'],
            sequential_global: row['Sequential_Global']
        })))
        .on('end', () => {
            const model = new FuzzyCMeans(population, groupNum, initialVectors); // Generate FCM model
            //console.log('Model:', model.partitionMatrix.map(v => ({ mat: v.vector, sum: v.vector.reduce((p, c) => p.add(c), new Decimal(0)) })));
            model.buildModel(maxIteration, minImprovement); // Build model
            //model.showPartitionMatrix();
            let groups = model.formGroups(); // Form groups from model
            console.log('Generated groups:', groups.map(group => ({
                id: group.id,
                centerVector: group.centerVector,
                members: group.members.map(member => member.person.name),
            })));
        });

}
