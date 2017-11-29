function dataService($http) {
    var baseSecurityGrouptUrl = siteConfigs.baseApiV1Url + "security-group";
    var baseEmailServiceUrl = siteConfigs.baseApiV1Url + "email";
    var baseDocUrl = siteConfigs.baseApiV1Url + "docs";

    return {
        getDoc: getDoc,
        getParentDocs: getParentDocs,
        downloadDoc: downloadDoc,
        sendEmailNotification: sendEmailNotification,
        checkUserInGroup: checkUserInGroup,
        checkUserInGroups: checkUserInGroups,
        searchDoc: searchDoc
    };

    function searchDoc(searchRequestObj, token) {
        //searchRequestObj.SeedPath - "\\InsiderFiles.Corp.ConnorGp.Com\SLDPermRepository$"
        //searchRequestObj.Keywords
        //searchRequestObj.PageNumber
        //searchRequestObj.PageSize
        //searchRequestObj.SearchExact 
        //searchRequestObj.SearchOr
        //searchRequestObj.Type = 0  vm.includeFilesInSearch && vm.includeFoldersInSearch
        //searchRequestObj.Type = 1  vm.includeFoldersInSearch 
        //searchRequestObj.Type = 2  vm.includeFilesInSearch =  2;
        //searchRequestObj.Type = 3   NONE
        //Call sharepoint search api to get search result
        //Then call solden API to get path
        var isDocument = '';
        if (searchRequestObj.Type == 1)
            isDocument = 'IsDocument:false';
        else if (searchRequestObj.Type == 2)
            isDocument = 'IsDocument:true';
        var rowlimit = searchRequestObj.PageSize;
        var startrow = (searchRequestObj.PageNumber - 1) * searchRequestObj.PageSize;
        var keywords = searchRequestObj.Keywords;
        if (!searchRequestObj.SearchExact) {
            var specialCharacters = '~!@#$%^&*()[]-+_=';
            var operator = searchRequestObj.SearchOr ? "* OR " : "* AND ";
            keywords = keywords.split(' ');

            for (var i = keywords.length - 1; i >= 0; i--) {
                if (specialCharacters.indexOf(keywords[i]) != -1)
                    keywords.splice(i, 1);
            }
            console.log(keywords);

            keywords = keywords.join(operator) + "* ";
        }
        var searchQuery = keywords + isDocument + ' path:' + searchRequestObj.SeedPath;
        var query = _spPageContextInfo.siteAbsoluteUrl + '/_api/search/query?querytext=\'' + searchQuery + '\'&rowlimit=' + rowlimit + '&startrow=' + startrow + '&selectproperties=\'Title,Path,HitHighlightedSummary\'';
        console.log(query);
        return $http.get(query, {
            headers: {
                "Content-Type": "application/json;odata=verbose",
                "Accept": "application/json;odata=verbose",
                "X-RequestDigest": __REQUESTDIGEST && __REQUESTDIGEST.value,
                "X-HTTP-Method": "MERGE",
                "If-Match": "*"
            }
        }).then(function (res) {
            var searchResultItems = [];
            var highlights = {};
            var totalCount = 0;
            res.data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results.forEach(function (item) {
                var linkQuery = item.Cells.results[3].Value.replace("file:", "").replaceAll('/', '\\');
                if (linkQuery[linkQuery.length - 1] == '\\')
                    linkQuery = linkQuery.substr(0, linkQuery.length - 1);
                searchResultItems.push(linkQuery);
                highlights[linkQuery.toLowerCase()] = item.Cells.results[4].Value;
            });

            totalCount = res.data.d.query.PrimaryQueryResult.RelevantResults.TotalRows;
            if (res.data.d.query.PrimaryQueryResult.RelevantResults.RowCount < searchRequestObj.PageSize) {
                totalCount = res.data.d.query.PrimaryQueryResult.RelevantResults.RowCount + startrow;
            }
            console.log(searchResultItems);
            return $http.post(baseDocUrl + '/SearchPathNames', JSON.stringify(searchResultItems), {
                headers: {
                    "Content-type": "application/json",
                    "Authorization": "Bearer " + token
                }
            }).then(function (d) { return getDataComplete(d, highlights, totalCount); });
        })

        function getDataComplete(d, highlights, totalCount) {
            d.data.Documents.forEach((doc) => {
                doc.HighlightText = highlights[doc.path_name.toLowerCase()];
            });
            d.data.TotalCount = totalCount;
            return d.data;
        }
    }

    function getDoc(pathId, token) {
        return $http.get(baseDocUrl + "/" + pathId, {
            headers: {
                "Content-type": "application/json",
                "Authorization": "Bearer " + token
            }
        }).then(getDataComplete);

        function getDataComplete(d) {
            return formatPathName(d.data);
        }
    }

    function getParentDocs(pathId, token) {
        return $http.get(baseDocUrl + "/" + pathId + '/parents', {
            headers: {
                "Content-type": "application/json",
                "Authorization": "Bearer " + token
            }
        }).then(getDataComplete);

        function getDataComplete(d) {
            return formatPathNameParent(d.data);
        }
    }

    function formatPathNameParent(jsonData) {
        if (jsonData && jsonData.length > 0) {
            for (var i = 0; i < jsonData.length; i++) {
                jsonData[i] = formatPathName(jsonData[i]);
            }
        }
        return jsonData;
    }

    function formatPathName(jsonData) {
        jsonData.DisplayName = getDisplayName(jsonData.PathName);

        if (jsonData.Children && jsonData.Children.length > 0) {
            for (var i = 0; i < jsonData.Children.length; i++) {
                jsonData.Children[i].DisplayName = getDisplayName(jsonData.Children[i].PathName);
            }
        }
        return jsonData;
    }

    function getDisplayName(path) {
        if (!path) debugger;
        return path && path.lastIndexOf('\\') >= 0 ? path.substr(path.lastIndexOf('\\') + 1) : path;
    }

    function downloadDoc(pathId, token) {
        return $http.get(baseDocUrl + "/" + pathId, {
            headers: {
                "Content-type": "application/json",
                "Authorization": "Bearer " + token
            }
        }).then(getDataComplete);

        function getDataComplete(result) {
            return result;
        }
    }

    function sendEmailNotification(data, token) {
        return $http.post(baseEmailServiceUrl + '/raw', JSON.stringify(data), {
            headers: {
                "Content-type": "application/json",
                "Authorization": "Bearer " + token
            }
        }).then(insertComplete);


        function insertComplete(data) {
            return data;
        }
    }

    function checkUserInGroup(groupName, userTitle, token) {
        return $http.get(baseSecurityGrouptUrl + "/group/" + groupName + "/user/" + userTitle, {
            headers: {
                "Content-type": "application/json",
                "Authorization": "Bearer " + token
            }
        })
            .then(getDataComplete);

        function getDataComplete(d) {
            return d.data;
        }
    }

    function checkUserInGroups(groupNames, userTitle, token) {
        return $http.get(baseSecurityGrouptUrl + "/groups/" + groupNames + "/user/" + userTitle, {
            headers: {
                "Content-type": "application/json",
                "Authorization": "Bearer " + token
            }
        })
            .then(getDataComplete);

        function getDataComplete(d) {
            return d.data;
        }
    }
}