const express = require("express");
const { open } = require("sqlite");
const sqlite = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "./covid19India.db");
let db = null;

const convertCase = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

const convertCaseD = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

const initalizeServerAndDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite.Database,
    });

    app.listen(3001, () => {
      console.log("server is running Successfully at 3001");
    });
  } catch (error) {
    console.log(`DB ERROR is ${error}`);
    process.exit(1);
  }
};

initalizeServerAndDB();

app.get("/states/", async (request, response) => {
  const query = `SELECT * FROM state ORDER BY state_id `;
  const result = await db.all(query);
  response.send(result.map((each) => convertCase(each)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const query = `SELECT * FROM state WHERE state_id = ${stateId} ;`;
  const result = await db.get(query);
  response.send(convertCase(result));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = ` INSERT INTO district (district_name, state_id, cases, cured , active , deaths) 
                        VALUES ('${districtName}' , ${stateId} , ${cases} , ${cured}, ${active}, ${deaths} );`;
  const result = await db.run(query);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query = `SELECT * FROM district WHERE district_id = ${districtId};`;
  const result = await db.get(query);
  response.send(convertCaseD(result));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query = `DELETE FROM district WHERE district_id = ${districtId};`;
  const result = await db.run(query);
  response.send("District Removed");
});

app.put("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `UPDATE district 
                            SET 
                                district_name = '${districtName}' ,
                                state_id = ${stateId} ,
                                cases =  ${cases} , 
                                cured = ${cured}, 
                                active = ${active}, 
                                deaths = ${deaths} `;
  const result = await db.run(query);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const query = `SELECT 
                            SUM(cases),
                            SUM(cured),
                            SUM(active),
                            SUM(deaths)
                        FROM
                            district
                        WHERE 
                            state_id = ${stateId}; `;
  const result = await db.get(query);
  response.send({
    totalCases: result["SUM(cases)"],
    totalCured: result["SUM(cured)"],
    totalActive: result["SUM(active)"],
    totalDeaths: result["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `SELECT state_id FROM district
                                WHERE district_id = ${districtId};`;

  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery);

  const getStateNameQuery = `SELECT state_name AS stateName 
                            FROM state WHERE state_id = ${getDistrictIdQueryResponse.state_id};`;
  const getStateNameQueryResponse = await db.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
});

module.exports = app;
