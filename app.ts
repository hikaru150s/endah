import { join } from "path";
import * as csv from 'fast-csv';
import { Person, FuzzyCMeans } from "./classes";
import Decimal from "decimal.js";

const population: Person[] = new Array<Person>();
const groupNum: number = 7;

csv.parseFile(join(__dirname, 'dataset.csv'), { headers: true, objectMode: true })
    .on('error', error => console.error(error))
    .on('data', row => population.push(new Person(row['Num'], row['Name'], {
        active_reflective: row['Active_Reflective'],
        sensing_intuitive: row['Sensing_Intuitive'],
        visual_verbal: row['Visual_Verbal'],
        sequential_global: row['Sequential_Global']
    })))
    .on('end', () => {
        const model = new FuzzyCMeans(population, groupNum);
        console.log('Model:', model.partitionMatrix.map(v => ({ mat: v.vector, sum: v.vector.reduce((p, c) => p.add(c), new Decimal(0)) })));
    });
