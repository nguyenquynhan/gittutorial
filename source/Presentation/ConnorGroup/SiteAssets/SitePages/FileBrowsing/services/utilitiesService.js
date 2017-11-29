function utilitiesService() {

    return {
        scrollToNode: scrollToNode
    }

    function scrollToNode(pathId) {
        var el = document.getElementById(pathId);
        if (el) {
            setTimeout(function () {
                if (!isInViewport(el)) {
                    el.scrollIntoView();
                }
            }, 500);
        }
    }

    function isInViewport(element) {
        var rect = element.getBoundingClientRect();
        console.log(rect);
        var html = document.documentElement;
        return (
            rect.top >= 250 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || html.clientHeight) &&
            rect.right <= (window.innerWidth || html.clientWidth)
        );
    }
}