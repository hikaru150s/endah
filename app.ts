/**
 * Hint:
 * 1.   Most of the calculation are relies on Third-Party module (decimal.js) due to floating-point precision problem on Javascript engine (here I use V8 javascript engine).
 * 2.   Most of the operation are utilize function-oriented programming (like .map(), .reduce(), .filter()) which provides ease of use for math-based problems (and shorter code, too).
 *      Here are a few example of some utilized function-oriented programming.
 *      
 *      a.  .map()      =>  result a new array with each element of array has been projected by mapper function.
 *      
 *          -   Procedural Programming
 *              let a = [5, 3, 7, 8, 1, 2];
 *              let b = [0, 0, 0, 0, 0, 0];
 *              for (let i = 0; i < a.length; i++) {
 *                  b[i] = a[i] * 4;
 *              }
 *              
 *          -   Function-Oriented Programming
 *              let a = [5, 3, 7, 8, 1, 2];
 *              let b = a.map(num => num * 4);
 *              
 *      b.  .reduce()   =>  result a reduced value from each element of array (in layman terms, reduce the array dimension).
 *      
 *          -   Procedural Programming
 *              let a = [5, 3, 7, 8, 1, 2];
 *              let b = 0;
 *              for (let i = 0; i < a.length; i++) {
 *                  b = b + a[i];
 *              }
 *              
 *          -   Function-Oriented Progamming
 *              let a = [5, 3, 7, 8, 1, 2];
 *              let b = a.reduce((prev, current) => prev + current)
 *              
 *      c.  .filter()   =>  result a new array which satisfy the filter function.
 *      
 *          -   Procedural Programming
 *              let a = [5, 3, 7, 8, 1, 2];
 *              let t = [null, null, null, null, null, null];
 *              let j = 0;
 *              for (let i = 0; i < a.length; i++) {
 *                  if (a[i] % 2 === 0) {
 *                      t[j] = a[i];
 *                      j = j + 1;
 *                  }
 *              }
 *              let b = new Array(j + 1);
 *              for (let i = 0; i < b.length; i++) {
 *                  b[i] = t[i];
 *              }
 *              
 *          -   Function-Oriented Programming
 *              let a = [5, 3, 7, 8, 1, 2];
 *              let b = a.filter(num => num % 2 === 0);
 *              
 * 3.   Math operation sum (∑ f(x)) is denoted by .map(x => f(x)).reduce((p, c) => p + c) (Because Sum operation is a limited MapReduce with addition function as its reducer).
 */

import { join } from "path";
import * as csv from 'fast-csv';
import { Person, FuzzyCMeans } from "./classes";
import Decimal from "decimal.js";

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
