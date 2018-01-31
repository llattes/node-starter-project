module.exports = function statusController(statusService) {
  return {
    get,
    getVersion
  };

  // ---

  function get(req, res) {
    res.json({ status: 'ok' });
  }

  function getVersion(req, res) {
    return statusService.getVersion()
      .then(function (response) {
        res.json(response);
      })
    ;
  }
};
