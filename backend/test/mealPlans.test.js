const expect = require("chai").expect;
const request = require("request");

const baseUrl = "http://localhost:8000";

describe("Meal Plans API (/api/mealplans)", function () {
  it("GET / returns public list with pagination fields", function (done) {
    request.get(`${baseUrl}/api/mealplans`, function (err, res, body) {
      if (err) return done(err);
      expect(res.statusCode).to.equal(200);
      const data = JSON.parse(body);
      expect(data).to.have.keys(["items", "total", "page", "pages"]);
      expect(data.items).to.be.an("array");
      done();
    });
  });

  it("GET /suggested requires auth → expect unauthorized", function (done) {
    request.get(`${baseUrl}/api/mealplans/suggested`, function (err, res) {
      if (err) return done(err);
      expect([401, 403]).to.include(res.statusCode);
      done();
    });
  });
});
