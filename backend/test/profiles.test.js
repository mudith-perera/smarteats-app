const expect = require("chai").expect;
const request = require("request");

const baseUrl = "http://localhost:8000";

describe("User Profile endpoints (/api/users/*)", function () {
  it("GET /me/profiles requires auth", function (done) {
    request.get(`${baseUrl}/api/users/me/profiles`, function (err, res) {
      if (err) return done(err);
      expect([401, 403]).to.include(res.statusCode);
      done();
    });
  });

  it("PUT /me/active-profile requires auth", function (done) {
    request.put(
      {
        url: `${baseUrl}/api/users/me/active-profile`,
        json: { profileId: "dummy" },
      },
      function (err, res) {
        if (err) return done(err);
        expect([401, 403]).to.include(res.statusCode);
        done();
      }
    );
  });

  it("GET /me/dashboard-info requires auth", function (done) {
    request.get(`${baseUrl}/api/users/me/dashboard-info`, function (err, res) {
      if (err) return done(err);
      expect([401, 403]).to.include(res.statusCode);
      done();
    });
  });

  it("DELETE /me/delete-profile/:id requires auth", function (done) {
    request.delete(
      `${baseUrl}/api/users/me/delete-profile/123`,
      function (err, res) {
        if (err) return done(err);
        expect([401, 403]).to.include(res.statusCode);
        done();
      }
    );
  });
});
