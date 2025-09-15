const expect = require("chai").expect;
const request = require("request");
const User = require("../models/User");

const baseUrl = "http://localhost:8000/api/users";

describe("Auth API", function () {
  it("registers a new user", function (done) {
    const email = `alsas_${Date.now()}@test.com`;
    request.post(
      {
        url: `${baseUrl}/register`,
        json: {
          firstName: "Sarah",
          lastName: "Doe",
          username: "Sarah",
          email,
          password: "Passw0rd!",
          gender: "female",
        },
      },
      async function (error, response, body) {
        expect([201, 409]).to.include(response.statusCode);
        done();
      }
    );
  });

  it("logs in with correct credentials", function (done) {
    const email = `bob_${Date.now()}@test.com`;
    request.post(
      {
        url: `${baseUrl}/register`,
        json: {
          firstName: "Bob",
          lastName: "Doe",
          username: "Bob",
          email,
          password: "Passw0rd!",
          gender: "male",
        },
      },
      function () {
        request.post(
          {
            url: `${baseUrl}/login`,
            json: { username: "Bob", password: "Passw0rd!" },
          },
          function (error, response, body) {
            expect(response.statusCode).to.equal(200);
            expect(body).to.have.property("token");
            done();
          }
        );
      }
    );
  });
});
