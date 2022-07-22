/* eslint-disable max-len */
/* eslint-disable guard-for-in */
module.exports = {
  collectParams: function(parameters) {
    const ordered = {};
    Object.keys(parameters).sort().forEach(function(key) {
      ordered[key] = parameters[key];
    });
    let encodedParameters = "";
    let k = 0;
    for (k in ordered) {
      const encodedValue = escape(ordered[k]);
      const encodedKey = encodeURIComponent(k);
      if (encodedParameters === "") {
        encodedParameters += encodeURIComponent(`${encodedKey}=${encodedValue}`);
      } else {
        encodedParameters += encodeURIComponent(`&${encodedKey}=${encodedValue}`);
      }
    }
    return encodedParameters;
  },

  authorizationString: function(parameters) {
    const ordered = {};
    Object.keys(parameters).sort().forEach(function(key) {
      ordered[key] = parameters[key];
    });
    let encodedParameters = "";
    let k = 0;
    for (k in ordered) {
      const encodedValue = escape(ordered[k]);
      const encodedKey = encodeURIComponent(k);
      if (encodedParameters === "") {
        encodedParameters += `${encodedKey}="${encodedValue}"`;
      } else {
        encodedParameters += `,${encodedKey}="${encodedValue}"`;
      }
    }
    return encodedParameters;
  },

  baseStringGen: function(encodedParameters, method, url) {
    const baseUrl = url;
    const encodedUrl = encodeURIComponent(baseUrl);
    const signatureBaseString = `${method}&${encodedUrl}&${encodedParameters}`;
    return signatureBaseString;
  },
};
