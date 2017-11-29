dialogController.$inject = ['$mdDialog'];
function dialogController($mdDialog) {
    var vm = this;
    vm.closeDialog = closeDialog;

    function closeDialog() {
        $mdDialog.hide();
    }
}