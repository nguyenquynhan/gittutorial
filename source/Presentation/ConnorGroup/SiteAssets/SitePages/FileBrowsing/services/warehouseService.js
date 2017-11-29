function warehouseService() {
    var pathList = [];

    return {
        storePath: storePath,
        getPath: getPath
    };

    function storePath(path) {
        if (pathList.length > 0)
        {
            var existingPath = $.grep(pathList, function (pathObj) {
                return pathObj.PathId == path.PathId;
            })[0];

            if (existingPath)
                existingPath = path;
            else
                pathList.push(path);
        }
        else
            pathList.push(path);

     
    };

    function getPath(pathId) {
        return $.grep(pathList, function (pathObj) {
            return pathObj.PathId == pathId;
        })[0];
    }
}