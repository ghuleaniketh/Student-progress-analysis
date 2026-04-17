
const axios = require("axios");

module.exports.analyseWithPython = async (data) => {
  const response = await axios.post(
    "http://127.0.0.1:8000/analyse",
    data
  );
  return response.data;
};