import { join } from "path";
import * as csv from 'fast-csv';
import { Person, FuzzyCMeans } from "./classes";
import Decimal from "decimal.js";

// Tweakable constants
const groupNum: number = 7;
const maxIteration: number = 100;
const minImprovement: Decimal = new Decimal(0.001);
const useRandomGeneratedDataset: boolean = false;

const population: Person[] = new Array<Person>();
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
].map(row => row.map(v => new Decimal(v)));

if (useRandomGeneratedDataset) {
    const datasetSize: number = 10000;
    const randomScoreFunction = (): number => (2 * Math.random() * 9) - 1;
    for (let i = 1; i <= datasetSize; i++) {
        population.push(new Person(i, `Person ${i}`, {
            active_reflective: randomScoreFunction(),
            sensing_intuitive: randomScoreFunction(),
            visual_verbal: randomScoreFunction(),
            sequential_global: randomScoreFunction(),
        }));
    }
    const model = new FuzzyCMeans(population, groupNum);
    //console.log('Model:', model.partitionMatrix.map(v => ({ mat: v.vector, sum: v.vector.reduce((p, c) => p.add(c), new Decimal(0)) })));
    model.buildModel(maxIteration, minImprovement);
    //model.showPartitionMatrix();
    let groups = model.formGroups();
    console.log('Generated groups:', groups);
} else {
    csv.parseFile(join(__dirname, 'dataset.csv'), { headers: true, objectMode: true })
        .on('error', error => console.error(error))
        .on('data', row => population.push(new Person(row['Num'], row['Name'], {
            active_reflective: row['Active_Reflective'],
            sensing_intuitive: row['Sensing_Intuitive'],
            visual_verbal: row['Visual_Verbal'],
            sequential_global: row['Sequential_Global']
        })))
        .on('end', () => {
            const model = new FuzzyCMeans(population, groupNum, initialVectors);
            //console.log('Model:', model.partitionMatrix.map(v => ({ mat: v.vector, sum: v.vector.reduce((p, c) => p.add(c), new Decimal(0)) })));
            model.buildModel(maxIteration, minImprovement);
            //model.showPartitionMatrix();
            let groups = model.formGroups();
            console.log('Generated groups:', groups.map(group => ({
                id: group.id,
                centerVector: group.centerVector,
                members: group.members.map(member => member.person.name),
            })));
        });

}
