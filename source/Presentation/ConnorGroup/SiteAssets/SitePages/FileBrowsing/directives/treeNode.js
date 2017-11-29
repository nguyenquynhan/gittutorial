function treeNode() {
    var directive = {
        restrict: 'E',
        templateUrl: '/ConnorGroup/SiteAssets/SitePages/FileBrowsing/templates/treeNode-tpl.html',
        scope: {
            pathId: '@',
            pathName: '@',
            parentPath: '@',
            container: '@',
            state: '@'
        },
        link: linkFunc,
        controller: treeNodeController,
        controllerAs: 'vm',
        bindToController: true
    };

    return directive;

    function linkFunc(scope, el, attr, ctrl) {

    }
}

treeNodeController.$inject = ['dataService', '$window', '$compile', '$scope', '$rootScope', 'warehouseService', 'historyService', 'blockUI'];
function treeNodeController(dataService, $window, $compile, $scope, $rootScope, warehouseService, historyService, blockUI) {
    var vm = this;
    vm.nodeTemplate = '<tree-node path-id="{0}" path-name="{1}" parent-path="{2}" container="{3}" state="{4}"></tree-node>';
    vm.parsedChildren = [];
    vm.myBlockUI = blockUI.instances.get('myBlockUI');

    // Functions
    vm.clickNode = clickNode;
    vm.generateContainerId = generateContainerId;
    vm.isSelected = isSelected;

    // Models
    var targetPath = warehouseService.getPath(vm.pathId);
    if (targetPath) {
        vm.parsedChildren = $.grep(targetPath.Children, function (pathObj) {
            return pathObj.Type == 1;
        });
    }

    $rootScope.$on('navigateFromSearchResult', function (event, data) {
        vm.fromPathSearchResultId = data.fromPathId;
    });

    $rootScope.$on('historyChange', function (event, data) {
        $window.selectedPathId = data;
    });

    $rootScope.$on('nodeChangeFromRightPanel', function (event, data) {
        if ($window.selectedPathId != data.pathId && vm.parentPath == data.parentPathName) {
            $window.selectedPathId = data.pathId;
            var storedPath = warehouseService.getPath(data.pathId);
            loadNode(storedPath, data.pathId);
        }

        if (vm.pathId == data.parentPathId) {
            if (vm.state == 'collapsed') {
                vm.state = 'expanded';
            }
        }
    });

    function isSelected() {
        return $window.selectedPathId == vm.pathId;
    }

    function clickNode(pathId) {
        $window.selectedPathId = pathId;

        if (!$rootScope.expandingFolderFromURl) {
            historyService.add(pathId);
        }

        // Click on the current node
        if (pathId == vm.pathId) {
            $rootScope.$broadcast('nodeChange', vm.pathId);
            if (vm.state == 'expanded') {
                if (vm.fromPathSearchResultId && vm.fromPathSearchResultId == pathId) {
                    //Do not collapsed if from search result and also remove this variable
                    vm.fromPathSearchResultId = null;
                }
                else
                    vm.state = 'collapsed';
            }
            else {
                vm.state = 'expanded';
            }
        }
        else {
            // Click child node
            var storedPath = warehouseService.getPath(pathId);
            if (storedPath) {
                loadNode(storedPath, pathId);

                // Broad cast data to right column
                $rootScope.$broadcast('nodeChange', pathId);
            }
            else {
                // Block the user interface
                vm.myBlockUI.start();

                getNodeData(pathId, function (data) {
                    warehouseService.storePath(data);

                    loadNode(data, pathId);

                    // Broad cast data to right column
                    $rootScope.$broadcast('nodeChange', pathId);

                    // Remove spinner
                    vm.myBlockUI.stop();
                });
            }
        }
    }

    function generateContainerId(pathId) {
        return $window.uiToolkit.formatString('node-{0}', pathId);
    }

    function getNodeData(pathId, getCompleted) {
        return $window.auth.getAccessToken().then(function (token) {
            dataService.getDoc(pathId, token)
                .then(getCompleted)
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

    function loadNode(path, parentPathId) {
        var containerId = $window.uiToolkit.formatString('#{0}', generateContainerId(parentPathId));
        var nodeTemplate = $window.uiToolkit.formatString(vm.nodeTemplate, path.PathId, path.DisplayName, path.PathName, generateContainerId(parentPathId), 'expanded');
        var rootContainer = angular.element(document.querySelector(containerId));
        var appendHtml = $compile(nodeTemplate)($scope);
        rootContainer.html(appendHtml);
    }
}