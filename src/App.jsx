// App.jsx
import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import airports from "./data/airports.json";
import aircraftData from "./data/aircraft.json";
import "./index.css";

const KEY_CSV = "am4_demand_csv";
const KEY_PRESETS = "am4_demand_presets";
const loadJSON = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) || f; } catch { return f; } };
const saveJSON = (k, d) => localStorage.setItem(k, JSON.stringify(d));

// Number input with blue header + white input styling, allows blank
const NumberInput = ({ label, value, onChange }) => (
  <div className="group">
    <div className="group-header">{label}</div>
    <input
      type="number"
      min={0}
      className="group-input"
      placeholder=""
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

// Flight stat line styling
const Stat = ({ label, value }) => (
  <div className="stat">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default function App() {
  // --- state ---
  const [depCountry, setDepCountry] = useState("");
  const [arrCountry, setArrCountry] = useState("");
  const [depAirport, setDepAirport] = useState("");
  const [arrAirport, setArrAirport] = useState("");
  const [y, setY] = useState("");
  const [j, setJ] = useState("");
  const [f, setF] = useState("");
  const [model, setModel] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [csvData, setCsvData] = useState(loadJSON(KEY_CSV, []));
  const [presets, setPresets] = useState(loadJSON(KEY_PRESETS, {}));
  const [solution, setSolution] = useState(null);

  // derive number of seats
  const seats = useMemo(() => {
    const ac = aircraftData.find(a => a.name === model);
    return ac ? ac.seats : 0;
  }, [model]);

  // unique countries
  const countries = useMemo(
    () => Array.from(new Set(airports.map(a => a.country))).sort(),
    []
  );

  // filter airports by country or all
  const depAirports = useMemo(
    () => airports.filter(a => !depCountry || a.country === depCountry),
    [depCountry]
  );
  const arrAirports = useMemo(
    () => airports.filter(a => !arrCountry || a.country === arrCountry),
    [arrCountry]
  );

  // autofill from presets
  useEffect(() => {
    if (!depAirport || !arrAirport) return;
    const keyA = `${depAirport}/${arrAirport}`;
    const keyB = `${arrAirport}/${depAirport}`;
    const p = presets[keyA] || presets[keyB];
    if (p) {
      setY(p.y.toString());
      setJ(p.j.toString());
      setF(p.f.toString());
    }
  }, [depAirport, arrAirport, presets]);

  // autofill from CSV if no preset
  useEffect(() => {
    if (!depAirport || !arrAirport || !csvData.length) return;
    const entry = csvData.find(r => {
      const [rDep] = (r["Departure Airport"] || "").split(" /");
      const [rArr] = (r["Arrival Airport"] || "").split(" /");
      return (
        (rDep === depAirport && rArr === arrAirport) ||
        (rDep === arrAirport && rArr === depAirport)
      );
    });
    if (entry) {
      setY((entry["Y Demand"] ?? entry.Y ?? 0).toString());
      setJ((entry["J Demand"] ?? entry.J ?? 0).toString());
      setF((entry["F Demand"] ?? entry.F ?? 0).toString());
    }
  }, [depAirport, arrAirport, csvData]);

  // swap handler
  const swap = () => {
    setDepCountry(arrCountry);
    setArrCountry(depCountry);
    setDepAirport(arrAirport);
    setArrAirport(depAirport);
  };

  // CSV upload
  const handleCsv = e => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: res => {
        setCsvData(res.data);
        saveJSON(KEY_CSV, res.data);
      }
    });
  };

  // solve logic
  const solve = () => {
    const yNum = parseInt(y) || 0;
    const jNum = parseInt(j) || 0;
    const fNum = parseInt(f) || 0;
    const total = yNum + jNum + fNum;
    if (!model || total === 0 || seats === 0) {
      setSolution(null);
      return;
    }
    const yRel = yNum / total;
    const jRel = jNum / total;
    const fRel = fNum / total;
    const k = seats / (yRel + 2 * jRel + 3 * fRel);
    const yPer = yRel * k;
    const jPer = jRel * k;
    const fPer = fRel * k;
    const flights = Math.ceil(total / (yPer + jPer + fPer));
    setSolution({ flights, yPer, jPer, fPer });
    const key = `${depAirport}/${arrAirport}`;
    const next = { ...presets, [key]: { y: yNum, j: jNum, f: fNum } };
    setPresets(next);
    saveJSON(KEY_PRESETS, next);
  };

  const displayModel = model ? `${model} (${seats})` : "";

  return (
    <div className="App">
      <section className="solver">
        <h1 className="solver-title">
          Airline Manager 4 <br></br>
          Aircraft Config Wizard
        </h1>

        {/* Departure & Arrival */}
        <div className="row">
          <div className="group">
            <div className="group-header">Departure Country</div>
            <input
              list="countries-from"
              className="group-input"
              placeholder="Country"
              value={depCountry}
              onChange={e => setDepCountry(e.target.value)}
            />
            <datalist id="countries-from">
              {countries.map(c => <option key={c} value={c} />)}
            </datalist>

            <div className="group-header">Departure Airport</div>
            <input
              list="airports-from"
              className="group-input"
              placeholder="Type IATA, ICAO, or name"
              value={depAirport}
              onChange={e => setDepAirport(e.target.value.split(" /")[0])}
            />
            <datalist id="airports-from">
              {depAirports.map(a => (
                <option
                  key={a.icao}
                  value={`${a.iata} / ${a.icao} - ${a.name}`}
                />
              ))}
            </datalist>
          </div>

          <button type="button" onClick={swap} className="swap-btn">⇄</button>

          <div className="group">
            <div className="group-header">Arrival Country</div>
            <input
              list="countries-to"
              className="group-input"
              placeholder="Country"
              value={arrCountry}
              onChange={e => setArrCountry(e.target.value)}
            />
            <datalist id="countries-to">
              {countries.map(c => <option key={c} value={c} />)}
            </datalist>

            <div className="group-header">Arrival Airport</div>
            <input
              list="airports-to"
              className="group-input"
              placeholder="Type IATA, ICAO, or name"
            value={arrAirport}
            onChange={e => setArrAirport(e.target.value.split(" /")[0])}
            />
            <datalist id="airports-to">
              {arrAirports.map(a => (
                <option
                  key={a.icao}
                  value={`${a.iata} / ${a.icao} - ${a.name}`}
                />
              ))}
            </datalist>
          </div>
        </div>

        {/* Aircraft selection */}
        <div className="model-group">
          <div className="group-header">Aircraft</div>
          <input
            list="aircrafts"
            className="group-input"
            placeholder="EX: ATR 42-320"
            value={displayModel}
            onChange={e => {
              // remove the trailing " (NNN)" when updating model
              const val = e.target.value.replace(/\s*\(\d+\)$/, "");
              setModel(val);
            }}
          />
          <datalist id="aircrafts">
            {aircraftData.map(a => (
              <option key={a.name} value={`${a.name} (${a.seats})`} />
            ))}
          </datalist>
        </div>

        {/* Demands */}
        <div className="demands">
          <NumberInput label="Y Demand" value={y} onChange={setY} />
          <NumberInput label="J Demand" value={j} onChange={setJ} />
          <NumberInput label="F Demand" value={f} onChange={setF} />
        </div>

        {/* Actions */}
        <div className="buttons">
          <button onClick={solve} className="btn btn-solve">SOLVE</button>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="btn btn-settings">⚙️</button>
        </div>

        {/* CSV Upload */}
        {showAdvanced && (
          <input type="file" accept=".csv" onChange={handleCsv} className="csv-upload" />
        )}

        {/* Results */}
        {solution && (
          <div className="results">
            <div className="results-grid">
              <Stat label="Y-class Seats" value={solution.yPer.toFixed(1)} />
              <Stat label="J-class Seats" value={solution.jPer.toFixed(1)} />
              <Stat label="F-class Seats" value={solution.fPer.toFixed(1)} />
            </div>
            <div className="results-total">Total flights per day: {solution.flights}</div>
          </div>
        )}
      </section>
    </div>
  );
}
