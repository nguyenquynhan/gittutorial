function historyService() {
    var pathIds = [];
    var cursor;

    return {
        init: init,
        back: back,
        forward: forward,
        add: add,
        canBack: canBack,
        canForward: canForward
    };

    function init(rootPathId) {
        pathIds.push(rootPathId);
        cursor = 0;
    };

    function back() {
        if (cursor > 0) {
            cursor--;
            return pathIds[cursor];
        }
    };

    function forward() {
        if (cursor < pathIds.length - 1) {
            cursor++;
            return pathIds[cursor];
        }
    };

    function add(pathId) {
        if (cursor < pathIds.length - 1) {
            pathIds.splice(cursor + 1);
        }
        pathIds.push(pathId);
        cursor++;
    };

    function canBack() {
        return cursor > 0;
    };

    function canForward() {
        return cursor >= 0 && cursor < pathIds.length - 1;
    };
}