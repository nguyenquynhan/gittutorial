angular.module('file-browsing', ['ngMaterial', 'ngMessages', 'ngclipboard', 'bw.paging', 'blockUI', 'reTree', 'ng.deviceDetector', 'ngSanitize'])
    .controller('fileBrowsingController', fileBrowsingController)
    .controller('treeNodeController', treeNodeController)
    .controller('folderContentController', folderContentController)
    .controller('dialogController', dialogController)
    .directive('treeNode', treeNode)
    .directive('folderContent', folderContent)
    .factory('dataService', dataService)
    .factory('warehouseService', warehouseService)
    .factory('historyService', historyService)
    .factory('utilitiesService', utilitiesService)
    .factory('brandingService', brandingService).config(function (blockUIConfig) {
        blockUIConfig.delay = 500;
    });

dataService.$inject = ['$http'];
fileBrowsingController.$inject = ['dataService', '$window', '$compile', '$scope', '$rootScope', 'warehouseService', 'historyService', 'brandingService', '$q', 'blockUI', 'utilitiesService', 'deviceDetector'];

function fileBrowsingController(dataService, $window, $compile, $scope, $rootScope, warehouseService, historyService, brandingService, $q, blockUI, utilitiesService, deviceDetector) {
    var vm = this;
    vm.deviceOs = deviceDetector.os;
    vm.myBlockUI = blockUI.instances.get('myBlockUI');
    console.log(vm.myBlockUI);
    vm.nodeTemplate = '<tree-node path-id="{0}" path-name="{1}" parent-path="{2}" container="{3}" state="{4}"></tree-node>';
    vm.rootDir = {
        pathId: brandingService.rootId,
        pathName: ''
    };
    $window.selectedPathId = vm.rootDir.pathId;

    defineHeightValue();


    $rootScope.$on('navigateFromSearchResult', function (event, data) {
        expandFolder(data.navPathId);
    });

    // Get root data
    getNodeData(vm.rootDir.pathId, function (data) {
        //console.log(data);
        vm.rootDir.pathName = data.PathName;
        warehouseService.storePath(data);

        var rootDirectoryName = vm.rootDir.pathName.substr(vm.rootDir.pathName.lastIndexOf('\\') + 1);
        var nodeTemplate = $window.uiToolkit.formatString(vm.nodeTemplate, data.PathId, vm.deviceOs == 'mac' ? '/' : '\\' + rootDirectoryName, vm.rootDir.pathName, 'li-root', 'expanded');
        var rootContainer = angular.element(document.querySelector('#li-root'));
        var appendHtml = $compile(nodeTemplate)($scope);
        rootContainer.html(appendHtml);

        // Broad cast data to right column
        $rootScope.$broadcast('nodeChange', vm.rootDir.pathId);
        historyService.init(vm.rootDir.pathId);

        //check if open a special folder
        var pathId = getURIParameter('pathId');
        if (pathId && pathId.trim()) {
            setTimeout(expandFolder, 100, pathId);
        }

        setTimeout(setFitHeightForContainers());
    });

    function getNodeData(pathId, getCompleted) {
        return $window.auth.getAccessToken().then(function (token) {
            dataService.getDoc(pathId, token)
                .then(getCompleted)
                .catch(onError);
        },
            function (err) {
                var logObj = {
                    Type: 1, // Client Scrip Error
                    Source: 'FileBrowserWidget',
                    Description: 'Get Access Token failed'
                };
                $window.uiToolkit.toastNotification.error('Get Access Token failed', 7000, logObj);
            });
    }

    function expandFolder(pathId) {
        vm.myBlockUI.start();
        getParentDocs(pathId)
            .then(function (paths) {
                if (!paths || !paths.length) {
                    showNotFoundNotification();
                } else {
                    setTimeout(expandPath, 0, paths);
                }
                vm.myBlockUI.stop();
            })
            .catch(onError);
    }

    function expandPath(paths) {
        //set expanding folder from URL in progress
        $rootScope.expandingFolderFromURl = true;
        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            if (path.PathName == brandingService.nativeFileSharePath || path.Type != 1) {
                continue;
            }

            warehouseService.storePath(path);
            var pathId = path.PathId;
            var containerId = $window.uiToolkit.formatString('#{0} {1}', generateContainerId(pathId), 'div');
            var rootContainer = angular.element(document.querySelector(containerId));
            rootContainer.click();

            if (i == (paths.length - 1)) {
                utilitiesService.scrollToNode(pathId);
            }
        }

        //reset expanding folder from URL in progress
        $rootScope.expandingFolderFromURl = false;
    }

    function getParentDocs(pathId) {
        return $q(function (resolve, reject) {
            $window.auth.getAccessToken().then(function (token) {
                dataService.getParentDocs(pathId, token)
                    .then(resolve)
                    .catch(reject);
            },
                function (err) {
                    reject(err);
                });
        });
    }

    function showNotFoundNotification() {
        window.uiToolkit.toastNotification.error('\
            <div class="errorPageWrap wrap warning" id="ErrorMessageOuterDiv" style="width: auto;">\
                <h1 class="error_msg_title notranslate" style="color:white; font-weight:bold">\
                    We can’t find what you’re looking for.\
                </h1>\
                <div>\
                    <p class="notranslate">This is likely because the folder has been removed.</p> \
                </div>\
            </div>', 10000);
    }

    function generateContainerId(pathId) {
        return $window.uiToolkit.formatString('node-{0}', pathId);
    }

    function getURIParameter(param, asArray) {
        return document.location.search.substring(1).split('&').reduce(function (p, c) {
            var parts = c.split('=', 2).map(function (param) { return decodeURIComponent(param); });
            if (parts.length == 0 || parts[0] != param) return (p instanceof Array) && !asArray ? null : p;
            return asArray ? p.concat(parts.concat(true)[1]) : parts.concat(true)[1];
        }, []);
    }

    function onError(error) { 
        if (error.status == 403 || (error.status == 500 && error.data.Message.indexOf('Access is denied') != -1)) {
            var message = 'Access Denied';
            message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
            $window.uiToolkit.toastNotification.error(message, 10000, null, function () { window.location = brandingService.homePath; });
        }
        else if (error.status == 404) {
            var message = 'The file or folder does not exist!';
            message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
            $window.uiToolkit.toastNotification.error(message, 10000, null, function () { window.location = brandingService.homePath; });
        }
        else {
            var message = error.data.Message;
            message += '<br> If you believe this is incorrect, please contact the <a style="text-decoration:underline" href="mailto:support@connorgp.com">helpdesk</a>.'
            $window.uiToolkit.toastNotification.error(message, 10000, null, null);
        }
        vm.myBlockUI.stop();
    }

    function defineHeightValue() {
        var outerContainer = angular.element(document.querySelector('#s4-workspace'));
        var titleBar = angular.element(document.querySelector('#s4-titlerow'));
        vm.relativeHeight = outerContainer.height() - titleBar.height() - 145;
    }

    function setFitHeightForContainers() {
        var topContainer = document.getElementById('top-container');
        if (topContainer) {
            topContainer.style.setProperty('height', vm.relativeHeight + 'px', 'important');
        }
    }
}





