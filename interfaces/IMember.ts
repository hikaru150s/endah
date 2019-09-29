import Decimal from "decimal.js";
import { Person } from "../classes";

export interface IMember {
    person: Person;
    vector: Decimal[];
}
