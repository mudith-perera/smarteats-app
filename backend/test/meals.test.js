const expect = require("chai").expect;
const request = require("request");

const baseUrl = "http://localhost:8000";

describe("Meals API (/api/meals)", function () {
  it("GET /suggest returns a static meal (no auth)", function (done) {
    request.get(`${baseUrl}/api/meals/suggest`, function (err, res, body) {
      if (err) return done(err);
      expect(res.statusCode).to.equal(200);
      const data = JSON.parse(body);
      expect(data).to.have.property("meal");
      done();
    });
  });

  it("POST /suggest returns suggestions when ingredients provided", function (done) {
    const payload = { ingredients: ["bread", "cheese"] };
    request.post(
      { url: `${baseUrl}/api/meals/suggest`, json: payload },
      function (err, res, body) {
        if (err) return done(err);
        expect(res.statusCode).to.equal(200);
        expect(body).to.be.an("array");
        done();
      }
    );
  });

  it("POST /suggest returns 400 when ingredients missing", function (done) {
    request.post(
      { url: `${baseUrl}/api/meals/suggest`, json: {} },
      function (err, res) {
        if (err) return done(err);
        expect(res.statusCode).to.equal(400);
        done();
      }
    );
  });

  it("POST / adds a new meal object", function (done) {
    const meal = { name: "Test Meal", ingredients: ["x"], steps: "mix" };
    request.post(
      { url: `${baseUrl}/api/meals`, json: meal },
      function (err, res, body) {
        if (err) return done(err);
        expect(res.statusCode).to.equal(201);
        expect(body).to.include({ name: "Test Meal" });
        done();
      }
    );
  });
});
