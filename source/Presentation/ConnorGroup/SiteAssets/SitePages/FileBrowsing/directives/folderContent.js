function folderContent() {
    var directive = {
        restrict: 'E',
        templateUrl: '/ConnorGroup/SiteAssets/SitePages/FileBrowsing/templates/folderContent-tpl.html',
        scope: {
        },
        link: linkFunc,
        controller: folderContentController,
        controllerAs: 'vm',
        bindToController: true
    };

    return directive;

    function linkFunc(scope, el, attr, ctrl) {

    }
}

folderContentController.$inject = ['dataService', '$window', '$compile', '$scope', '$rootScope', '$sce', '$mdDialog', 'warehouseService', 'historyService', 'brandingService', 'blockUI', 'deviceDetector', 'utilitiesService'];
function folderContentController(dataService, $window, $compile, $scope, $rootScope, $sce, $mdDialog, warehouseService, historyService, brandingService, blockUI, deviceDetector, utilitiesService) {
    var vm = this;
    vm.items = [];
    vm.orgItems = [];

    vm.myBlockUI = blockUI.instances.get('myBlockUI');
    vm.displayMode = 'list';
    vm.canBack = false;
    vm.canForward = false;
    vm.canUp = false;
    vm.parentPathId = null;
    vm.searchText = "";
    vm.searchTextCaption = "";
    vm.deviceOS = deviceDetector.os;
    vm.isMobile = vm.deviceOS == 'ios' || vm.deviceOS == 'android' || vm.deviceOS == 'windows-phone';
    vm.folderPath = $sce.trustAsHtml(vm.deviceOS == 'mac' ? '/' : '\\');
    vm.includeFoldersInSearch = true;
    vm.includeFilesInSearch = true;
    vm.searchExactKeyword = false;
    vm.searchOr = false;
    vm.displayAdvSearch = false;

    // paging
    vm.pagingItems = [];
    vm.pageSize = 10;
    vm.totalRecord = 0;
    vm.page = 1;
    vm.pagingModel = []
    // searching
    vm.searchDocRequestObj = {
        PageSize: vm.pageSize,
        PageNumber: vm.page,
        SearchExact: false,
        Type: 0,
        SeedPath: '',
        Keywords: ''
    };

    // functions
    vm.setDisplayMode = setDisplayMode;
    vm.formatDisplaySize = formatDisplaySize;
    vm.doubleClickNode = doubleClickNode;
    vm.openMenu = openMenu;
    vm.getLink = getLink;
    vm.getLinkFolder = getLinkFolder;
    vm.backward = backward;
    vm.forward = forward;
    vm.up = up;
    vm.getDownLoadLink = getDownLoadLink;
    vm.getFileIconClass = getFileIconClass;
    vm.doPaging = doPaging;
    vm.trustHTML = trustHTML;
    vm.filterFolder = filterFolder;
    vm.getFileSharePath = getFileSharePath;
    vm.displayCopiedMessage = displayCopiedMessage;
    vm.navigateFromSearch = navigateFromSearch;

    $rootScope.$on('nodeChange', function (event, data) {
        checkBackForwardState();
        var path = warehouseService.getPath(data);
        if (path) {
            getFolderPath(path);

            vm.parentPathId = path.ParentPathId;
            vm.searchTextCaption = 'Search ' + getParentFolderName(path.PathName);
            vm.currentPathName = path.PathName;
            vm.currentPathId = path.PathId;

            checkUpState();

            vm.items = angular.copy(path.Children);
            vm.orgItems = angular.copy(path.Children);

            clearSearchMode();
            handleBreadcrumb(path);
        }
    });

    function pagingForBrowseCase() {
        // Do paging if more than 100 items
        vm.pagingItems = [];
        vm.page = 1;
        if (vm.items.length > vm.pageSize) {
            for (var j = 0; j < vm.pageSize; j++) {
                vm.pagingItems.push(vm.items[j]);
            }
            vm.totalRecord = vm.items.length;
        }
        else {
            vm.pagingItems = vm.items;
        }
    }

    function getFolderPath(path) {
        if (path.PathName != brandingService.nativeFileSharePath) {
            vm.folderPath = path.PathName.replace(brandingService.nativeFileSharePath, '');

            // Mac Os uses slash(/) in stead of backslash(\)
            if (vm.deviceOS == 'mac') {
                vm.folderPath = vm.folderPath.split('\\').join('/');
            }
        }
    }

    function getFileSharePath() {
        var result = '';

        //if (vm.deviceOS == 'mac') {
        //    result = brandingService.nativeFileSharePathMac;
        //} else {
        //    result = brandingService.nativeFileSharePath;
        //}

        if (vm.folderPath)
            result += vm.folderPath;

        return result;
    }

    function displayCopiedMessage() {
        $('#clipboard-button').append('<div class="copied-popup">Copied!</div>');
        setTimeout(function () { $('.copied-popup').remove(); }, 1500);
    }

    function getParentFolderName(pathName) {
        var removeIndex = pathName.lastIndexOf('\\');
        return pathName.substring(removeIndex + 1, pathName.length);
    }

    function setDisplayMode(mode) {
        vm.displayMode = mode;
    }

    function formatDisplaySize(size) {
        var count = 0;
        var unit = 'KB';
        while (size >= 1000) {
            size = size / 1000;
            count++;
        }

        switch (count) {
            case 1:
                size = (size).toFixed(0);
                unit = 'KB';
                break;
            case 2:
                size = (size).toFixed(0);
                unit = 'MB';
                break;
            case 3:
                size = (size).toFixed(2);
                unit = 'GB';
                break;
            case 4:
                size = (size).toFixed(2);
                unit = 'TB';
                break;
            default:
                size = 1;
                break;
        }

        return $window.uiToolkit.formatString('{0} {1}', parseFloat(size), unit);
    }

    function getFileIconClass(fileName) {
        var extensionArrayList = [{
            className: 'fa fa-file-archive-o',
            exts: ['7z', 'deb', 'gz', 'pkg', 'rar', 'rpm', 'sit', 'sitx', 'zip', 'zipx']
        },
        {
            className: 'fa fa-file-audio-o',
            exts: ['aif', 'iff', 'm3u', 'm4a', 'mid', 'mp3', 'mpa', 'ra', 'wav', 'wma']
        },
        {
            className: 'fa fa-file-code-o',
            exts: ['cs', 'js', 'ts', 'aspx', 'cshtml', 'xml', 'html', 'css', 'class', 'c', 'cpp', 'dtd', 'fla', 'java', 'm', 'pl', 'py', 'sql']
        },
        {
            className: 'fa fa-file-excel-o',
            exts: ['xlr', 'xls', 'xlsx', 'csv']
        },
        {
            className: 'fa fa-file-image-o',
            exts: ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'thm', 'tif', 'yuv']
        },
        {
            className: 'fa fa-file-movie-o',
            exts: ['3g2', '3gp', 'asf', 'asx', 'avi', 'flv', 'mov', 'mp4', 'mpg', 'rm', 'swf', 'vob', 'wmv']
        },
        {
            className: 'fa fa-file-pdf-o',
            exts: ['pdf']
        },
        {
            className: 'fa fa-file-powerpoint-o',
            exts: ['pps', 'ppt', 'pptx', 'pptm']
        },
        {
            className: 'fa fa-file-text-o',
            exts: ['rtf', 'txt', 'log']
        },
        {
            className: 'fa fa-file-word-o',
            exts: ['doc', 'docx']
        }];

        // Get file extension
        var fileExtension = '';
        var fileParts = fileName.split('.');
        if (fileParts.length > 1)
            fileExtension = fileParts[fileParts.length - 1].toLowerCase();

        // Get the index of extension list that a file extension belongs to
        var className = 'fa fa-file-o';
        for (var i = 0; i < extensionArrayList.length; i++) {
            if (extensionArrayList[i].exts.indexOf(fileExtension) != -1) {
                className = extensionArrayList[i].className;
                break;
            }
        }
        return className;
    }

    function doubleClickNode(path) {
        // Get parent pathName
        var lastBackSlash = path.PathName.lastIndexOf('\\');
        var parentPathName = path.PathName.substring(0, lastBackSlash);

        // Folder
        if (path.Type == 1) {
            var storedPath = warehouseService.getPath(path.PathId);
            if (storedPath) {
                $rootScope.$broadcast('nodeChange', storedPath.PathId);
                $rootScope.$broadcast('nodeChangeFromRightPanel', { pathId: storedPath.PathId, parentPathName: parentPathName, parentPathId: path.ParentPathId });
            }
            else {
                // Start spinner
                vm.myBlockUI.start();

                $window.auth.getAccessToken().then(function (token) {
                    dataService.getDoc(path.PathId, token)
                        .then(function (data) {
                            warehouseService.storePath(data);

                            // Broad cast data to right column
                            $rootScope.$broadcast('nodeChange', data.PathId);
                            $rootScope.$broadcast('nodeChangeFromRightPanel', { pathId: data.PathId, parentPathName: parentPathName, parentPathId: path.ParentPathId });
                            // Remove spinner
                            vm.myBlockUI.stop();
                        })
                        .catch(function (error) {
                            if (error.status == 403 || (error.status == 500 && error.data.Message.indexOf('Access is denied') != -1)) {
                                var message = 'Access Denied';
                                message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
                                $window.uiToolkit.toastNotification.error(message, 10000, null, null);
                            }
                            else if (error.status == 404) {
                                var message = 'The file or folder does not exist!';
                                message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
                                $window.uiToolkit.toastNotification.error(message, 10000, null, null);
                            }
                            else {
                                var message = error.data.Message;
                                message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
                                $window.uiToolkit.toastNotification.error(message, 10000, null, null);
                            }
                            vm.myBlockUI.stop();
                        });
                });
            }
            historyService.add(path.PathId);
        }
    }

    var originatorEv;
    function openMenu($mdOpenMenu, ev) {
        originatorEv = ev;
        $mdOpenMenu(ev);
    }

    function getLink(item) {
        var name = item.DisplayName;
        if (item.RealName)
            name = item.RealName;

        var link = $window.uiToolkit.formatString('{0}/f/{1}/{2}', brandingService.baseUrl, item.PathId, name.split(' ').join('-'));

        $mdDialog.show({
            controller: dialogController,
            templateUrl: '/ConnorGroup/SiteAssets/SitePages/FileBrowsing/templates/fileLinkDialog-tpl.html',
            parent: angular.element(document.body),
            targetEvent: originatorEv,
            clickOutsideToClose: true,
            locals: {
                text: link,
                title: name
            },
            bindToController: true,
            controllerAs: 'vm'
        });

        originatorEv = null;
    }

    function getLinkFolder(item) {
        var originLink = window.location.origin;
        if (!originLink) { //fix for IE
            originLink = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
        }
        var baseFolderUrl = originLink + location.pathname;
        var link = $window.uiToolkit.formatString('{0}?pathId={1}', baseFolderUrl, item.PathId);

        $mdDialog.show({
            controller: dialogController,
            templateUrl: '/ConnorGroup/SiteAssets/SitePages/FileBrowsing/templates/fileLinkDialog-tpl.html',
            parent: angular.element(document.body),
            targetEvent: originatorEv,
            clickOutsideToClose: true,
            locals: {
                text: link,
                title: item.DisplayName
            },
            bindToController: true,
            controllerAs: 'vm'
        });

        originatorEv = null;
    }

    function getDownLoadLink(item) {
        var name = item.DisplayName;
        if (item.RealName)
            name = item.RealName;

        return $window.uiToolkit.formatString('{0}/f/{1}/{2}', brandingService.baseUrl, item.PathId, name.split(' ').join('-'));
    }

    function backward() {
        if (vm.canBack) {
            var pathId = historyService.back();
            // Broad cast data to right column
            $rootScope.$broadcast('nodeChange', pathId);
            $rootScope.$broadcast('historyChange', pathId);
        }

        checkBackForwardState();
    }

    function forward() {
        if (vm.canForward) {
            var pathId = historyService.forward();
            // Broad cast data to right column
            $rootScope.$broadcast('nodeChange', pathId);
            $rootScope.$broadcast('historyChange', pathId);
        }

        checkBackForwardState();
    }

    function checkBackForwardState() {
        vm.canBack = historyService.canBack();
        vm.canForward = historyService.canForward();
    }

    function up() {
        if (vm.canUp) {
            historyService.add(vm.parentPathId);
            $rootScope.$broadcast('historyChange', vm.parentPathId);
            $rootScope.$broadcast('nodeChange', vm.parentPathId);
        }
        checkUpState();
    }

    function checkUpState() {
        vm.canUp = vm.parentPathId != null;
    }

    /* Zone of breadcrumb functions*/
    vm.navigateBreadcrumb = navigateBreadcrumb;
    vm.breadcrumbNodes = [];
    vm.breadcrumbTree = null;

    function handleBreadcrumb(path) {

        // First, make sure to build the tree when having new nodes
        buildBreadcrumbTree(path);

        // Then travel back to get the current breadcrumb navigation array
        var name = path.PathName.substr(path.PathName.lastIndexOf('\\') + 1);
        vm.breadcrumbNodes = [];
        vm.breadcrumbNodes.push({
            pathId: path.PathId,
            name: name,
            parentPathId: path.ParentPathId
        });

        // Travel until back to root
        if (path.ParentPathId) {

            // If that is the second level, no need to run loop
            if (path.ParentPathId == vm.breadcrumbTree.pathId) {
                vm.breadcrumbNodes.push({
                    pathId: vm.breadcrumbTree.pathId,
                    name: vm.breadcrumbTree.name,
                    parentPathId: null
                });
            }
            else {
                var parentPathId = path.ParentPathId;
                while (true) {
                    travelBackwardBreadcrumbTree(vm.breadcrumbTree.children, parentPathId);
                    parentPathId = vm.breadcrumbNodes[vm.breadcrumbNodes.length - 1].parentPathId;
                    if (parentPathId == vm.breadcrumbTree.pathId)
                        break;
                }
            }
        }

        if (vm.breadcrumbNodes.length > 0) {

            // Push the root node into array if not exist
            isRootExist = $.grep(vm.breadcrumbNodes, function (item) { return item.pathId == vm.breadcrumbTree.pathId; }).length > 0;

            if (!isRootExist) {
                vm.breadcrumbNodes.push({
                    pathId: vm.breadcrumbTree.pathId,
                    name: vm.breadcrumbTree.name
                });
            }

            // Reverse the node array so that parents are displayed first
            vm.breadcrumbNodes.reverse();
        }
    }

    function buildBreadcrumbTree(path) {
        if (!path.ParentPathId && vm.breadcrumbTree == null) {
            // Bootstrap root
            vm.breadcrumbTree = {
                pathId: path.PathId,
                parentPathId: null,
                name: path.PathName.substr(path.PathName.lastIndexOf('\\') + 1),
                children: []
            }
            for (var i = 0; i < path.Children.length; i++) {
                if (path.Children[i].Type == 1) {
                    vm.breadcrumbTree.children.push({
                        pathId: path.Children[i].PathId,
                        parentPathId: path.PathId,
                        name: path.Children[i].PathName.substr(path.Children[i].PathName.lastIndexOf('\\') + 1),
                        children: []
                    });
                }
            }
        }
        else {
            pushNewPathToCorrectBranch(vm.breadcrumbTree.children, path);
        }
    }

    function pushNewPathToCorrectBranch(currentBranchArr, path) {
        for (var i = 0; i < currentBranchArr.length; i++) {
            if (path.PathId == currentBranchArr[i].pathId) {
                for (var j = 0; j < path.Children.length; j++) {
                    if (path.Children[j].Type == 1) {
                        currentBranchArr[i].children.push({
                            pathId: path.Children[j].PathId,
                            parentPathId: path.PathId,
                            name: path.Children[j].PathName.substr(path.Children[j].PathName.lastIndexOf('\\') + 1),
                            children: []
                        });
                    }
                }
                break;
            }
            else {
                var newCurrentBranchArr = currentBranchArr[i].children;
                pushNewPathToCorrectBranch(newCurrentBranchArr, path);
            }
        }
    }

    function navigateBreadcrumb(node) {
        historyService.add(vm.parentPathId);
        $rootScope.$broadcast('historyChange', node.pathId);
        $rootScope.$broadcast('nodeChange', node.pathId);
        utilitiesService.scrollToNode(node.pathId);
    }

    function travelBackwardBreadcrumbTree(checkArr, parentPathId) {
        for (var i = 0; i < checkArr.length; i++) {
            if (checkArr[i].pathId == parentPathId) {
                // If yes, push to array and break
                vm.breadcrumbNodes.push(
                    {
                        pathId: checkArr[i].pathId,
                        name: checkArr[i].name,
                        parentPathId: checkArr[i].parentPathId
                    });
                break;
            }
            else {
                // If no, go deeper
                var newCheckArr = checkArr[i].children;
                travelBackwardBreadcrumbTree(newCheckArr, parentPathId);
            }
        }
    }

    /* Zone of search functions*/
    function filterFolder(text, isPaging) {
        isPaging = typeof isPaging !== 'undefined' ? isPaging : false;

        if (text != '') {
            console.log("Search");
            vm.displayMode = 'search';
            vm.searchDocRequestObj.SeedPath = vm.currentPathName;
            vm.searchDocRequestObj.Keywords = vm.searchExactKeyword ? text : text.toLowerCase();
            vm.searchDocRequestObj.Type = decideItemTypeIntegerValue();
            vm.searchDocRequestObj.SearchExact = vm.searchExactKeyword;
            vm.searchDocRequestObj.SearchOr = vm.searchOr;
            //Search new or condition change
            //Set page to 1
            if (!isPaging) {
                vm.page = 1;
                vm.searchDocRequestObj.PageNumber = vm.page;
            }

            if (vm.searchDocRequestObj.Type < 3) {
                $window.auth.getAccessToken().then(function (token) {
                    dataService.searchDoc(vm.searchDocRequestObj, token)
                        .then(function (data) {
                            if (data.Errors.length == 0 && vm.displayMode == 'search') {
                                vm.pagingItems = [];
                                //vm.page = 1;
                                for (var i = 0; i < data.Documents.length; i++) {
                                    var realPathName = data.Documents[i].path.replace(vm.currentPathName, '');

                                    vm.pagingItems.push(
                                        {
                                            DisplayName: highlight(data.Documents[i].name, vm.searchDocRequestObj.Keywords),
                                            RealName: data.Documents[i].name,
                                            Path: highlight(realPathName, vm.searchDocRequestObj.Keywords),
                                            PathId: data.Documents[i].path_id,
                                            Type: data.Documents[i].type,
                                            HighlightText: data.Documents[i].HighlightText
                                        }
                                    );
                                }
                                //If search new set totalRecord = totalCount return from sharepoint
                                if (!isPaging) {
                                    vm.totalRecord = data.TotalCount;
                                }
                                //If paging only set when total record < totalCount return from sharepoint
                                else if (isPaging && vm.totalRecord < data.TotalCount) {
                                    vm.totalRecord = data.TotalCount;
                                }

                            }
                            else {
                                // handle displaying errors here
                            }
                        })
                        .catch(function (error) {
                            if (error.status == 403 || (error.status == 500 && error.data.Message.indexOf('Access is denied') != -1)) {
                                var message = 'Access Denied';
                                message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
                                $window.uiToolkit.toastNotification.error(message, 10000, null, null);
                            }
                            else if (error.status == 404) {
                                var message = 'The file or folder does not exist!';
                                message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
                                $window.uiToolkit.toastNotification.error(message, 10000, null, null);
                            }
                            else {
                                var message = error.data.Message;
                                message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
                                $window.uiToolkit.toastNotification.error(message, 10000, null, null);
                            }
                        });
                });
            }
            else {
                vm.totalRecord = 0;
                vm.pagingItems = [];
            }

        }
        else {
            clearSearchMode();
        }
    }

    function clearSearchMode() {
        vm.displayMode = 'list';
        vm.searchText = '';
        vm.totalRecord = 0;
        pagingForBrowseCase();
    }

    function navigateFromSearch(item) {
        vm.items = [];
        vm.pagingItems = [];
        clearSearchMode();
        historyService.add(item.PathId);
        $rootScope.$broadcast('navigateFromSearchResult', { navPathId: item.PathId, fromPathId: vm.currentPathId });
    }

    function highlight(input, keywords) {
        var result = input;
        if (vm.searchExactKeyword) {
            result = result.replace(new RegExp(keywords.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1"), 'g'), '<span class="highlightedText">$&</span>');
        }
        else {
            var keywordArr = keywords.split(' ');
            for (var i = 0; i < keywordArr.length; i++) {
                result = result.replace(new RegExp(keywordArr[i].replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1"), 'gi'), '<span class="highlightedText">$&</span>');
            }
        }
        return result;
    }

    function decideItemTypeIntegerValue() {
        if (vm.includeFilesInSearch && vm.includeFoldersInSearch)
            return 0;
        if (vm.includeFoldersInSearch)
            return 1;
        if (vm.includeFilesInSearch)
            return 2;
        return 3;
    }

    ///Paging 


    function doPaging(pagingEventName, page, pageSize, total) {
        if (vm.displayMode == 'search') {
            vm.searchDocRequestObj.PageNumber = page;
            filterFolder(vm.searchText, true);
            vm.page = page;
        }
        else {
            var startIndex = (page - 1) * vm.pageSize;
            var endIndex = startIndex + vm.pageSize;
            if (endIndex > vm.totalRecord)
                endIndex = vm.totalRecord;
            vm.page = page;
            vm.pagingItems = [];
            for (var j = startIndex; j < endIndex; j++) {
                vm.pagingItems.push(vm.items[j]);
            }
        }
    }
    function trustHTML(html_code) {
        return $sce.trustAsHtml(html_code);
    }
    ///End paging
}