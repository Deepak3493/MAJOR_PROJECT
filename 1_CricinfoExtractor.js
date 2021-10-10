// the purpose of this project is to extract information of worldcup 2019 from cricinfo
// the real purpose of this project is to learn how to extract information and get experience with js
// a very good reason is to make a project is to have  good fun

//npm init -y
//npm install minimist
//npm install axios
//npm install jsdom
//npm install excel4node
//npm install pdf-lib

// node 1_CricinfoExtractor.js --excel=Worldcup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results 

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");


// download using axios
// extract information using jsdom
// manipulate data using array functions
// save in excel using excel4node
// create folders and prepare pdfs
// read the arguments passed to the user
let args = minimist(process.argv);

let responseKaPromise = axios.get(args.source);
//jab ham url likhte hain browser m functionaliyt likhi hai jab request bheji
// jati h url dal ke to httm protocol k anusar ek requrest object bnya ajata h
// aur bheja jata h wo bnaya gaya h http protocol ke anusar bnaya gya server 
//ne use smajh liye usne object bnaya response ka aur html aur bhi sari cheeje
// dal ke bhej deta h server back to client
responseKaPromise.then(function (response) {
    let html = response.data;
    //fetch the javascipt dom;
    let JSDOM = jsdom.JSDOM;
    //dom represent the html into tree form;
    //jsdom tree bnane wali representation k sath deal krta h;
    let dom = new JSDOM(html);
    //  window.document returns a reference to the document contained in the window. Example. console. log (window. document. title); 
    let document = dom.window.document;

    // we will put all the matches inside this array matches
    let matches = [];

    //we will fetch all the boxes of the scores 
    // queryselector finds all the div having mtch-scores-block class
    let matchScoresDivs = document.querySelectorAll("div.match-info-FIXTURES");
    //console.log(matchScoresDivs);

    // fetch all the matches from all the divs
    // matchscoreDivs have 48 length as there were 48 matches happened in worldcup 2019
    for (let i = 0; i < matchScoresDivs.length; i++) {
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };
        ///aisa  span do jiske pappa div hain aur uspe  name.detail class lagi huyi hai
        let namePs = matchScoresDivs[i].querySelectorAll("div.name-detail>p.name");
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;
        //console.log(match);
        let scoreSpans = matchScoresDivs[i].querySelectorAll("div.score-detail>span.score");
        if (scoreSpans.length >= 2) {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = scoreSpans[0].textContent;
        } else if (scoreSpans.length ==1) {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let spanResult = matchScoresDivs[i].querySelector("div.status-text >span");
        match.result = spanResult.textContent;
        matches.push(match);
        console.log(match);  
    }
    // we have matches irregularly stored 
    // lets write it into a file after converting into string from jso
    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJSON, "utf-8");
    // we want like team aray have india's matches together and australias matches together  and other teams matches separately  like team and all the matches of that team with all other teams
    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        addTeamToTeamsArrayIfNotAlreadyThere(teams, matches[i]);
    }

    for (let i = 0; i < matches.length; i++){
        addMatchToSpecificTeam(teams, matches[i]);
    }

    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");

    // console.log(JSON.stringify(teams));

    createExcelFile(teams);
    createFolders(teams);

}).catch(function (err) {
    console.log(err);
})


function addTeamToTeamsArrayIfNotAlreadyThere(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        });
    }

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        });
    }
}

// this functin will place all the team and all the matches of that team
function addMatchToSpecificTeam(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            
            break;
        }
    }
    //take that index and find the object placed at that index
    // then push the t2 team in its matches array o objects
    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    });

    // similarly find out team2 in teams array
    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    // after finding the object at t2index  in teams
    let team2 = teams[t2idx];
    //then push t1 team in t2 team matches array
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    });
}


function createFolders(teams) {
    fs.mkdirSync(args.dataFolder);
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.dataFolder, teams[i].name);
        //fs.mkdirSync(teamFN);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}

function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result = match.result;

    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 320,
            y: 729,
            size: 8
        });
        page.drawText(t2, {
            x: 320,
            y: 715,
            size: 8
        });
        page.drawText(t1s, {
            x: 320,
            y: 701,
            size: 8
        });
        page.drawText(t2s, {
            x: 320,
            y: 687,
            size: 8
        });
        page.drawText(result, {
            x: 320,
            y: 673,
            size: 8
        });

        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function (finalPDFBytes) {
            fs.writeFileSync(matchFileName, finalPDFBytes);
        })
    })
}



function createExcelFile(teams) {
    let wb = new excel.Workbook();

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1, 1).string("VS");
        sheet.cell(1, 2).string("Self Score");
        sheet.cell(1, 3).string("Opp Score");
        sheet.cell(1, 4).string("Result");
        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);
        }
    }
    wb.write(args.excel);
}