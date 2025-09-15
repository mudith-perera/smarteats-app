const expect = require("chai").expect;
const request = require("request");

const baseUrl = "http://localhost:8000";

describe("Users API", function () {
  it("GET /api/users/me should reject if no token", function (done) {
    request.get(`${baseUrl}/api/users/me`, function (error, response, body) {
      expect(response.statusCode).to.not.equal(200);
      done();
    });
  });
});
