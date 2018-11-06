const { BULK_RESOURCE, patch } = require('./common');

exports.handleBulkPatchRequest = async (req, res, next) => {
  try {
    if (req.method === 'PATCH' && req.resource === BULK_RESOURCE) {
      if (!Array.isArray(req.body)) {
        return res.sendStatus(400); // bad request
      }
      await req.wrestler.dbDriver.withTransaction(async () => {
        const patcher = patch(req.wrestler);
        // bulk patch requests require the id to be supplied in the body instead of the url
        const results = await Promise.all(req.body.slice(0).map(body => patcher((body.id || body._id), body)));
        res.json(results);
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
