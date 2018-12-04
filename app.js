const fs = require('fs')
const papa = require('papaparse')
const file = fs.createReadStream('DataTugas2.csv');
const json2csv = require('json2csv').Parser
const fields = ['field1', 'field2', 'field3'];
const opts = { fields };

const PENDAPATAN = [0, .5, .7, 1, 1.3, 1.5, 2]
const HUTANG = [0, 40, 45, 50, 55, 60, 100]

var tebakan = []

const aturanFuzzy = [
    { //p: pendapatan, h: hutang, d: dapat bantuan
        p : { level : 'rendah', value : null },
        h : { level : 'kecil', value : null },
        d : { level : 'tidak', value : null }
    },
    { 
        p : { level : 'rendah', value : null },
        h : { level : 'sedang', value : null },
        d : { level : 'iya', value : null }
    },  
    { 
        p : { level : 'rendah', value : null },
        h : { level : 'besar', value : null },
        d : { level : 'iya', value : null }
    }, 
    { 
        p : { level : 'menengah', value : null },
        h : { level : 'kecil', value : null },
        d : { level : 'tidak', value : null }
    },    
    { 
        p : { level : 'menengah', value : null },
        h : { level : 'sedang', value : null },
        d : { level : 'tidak', value : null }
    },  
    { 
        p : { level : 'menengah', value : null },
        h : { level : 'besar', value : null },
        d : { level : 'iya', value : null }
    },  
    { 
        p : { level : 'tinggi', value : null },
        h : { level : 'kecil', value : null },
        d : { level : 'tidak', value : null }
    },  
    { 
        p : { level : 'tinggi', value : null },
        h : { level : 'sedang', value : null },
        d : { level : 'tidak', value : null }
    },  
    { 
        p : { level : 'tinggi', value : null },
        h : { level : 'besar', value : null },
        d : { level : 'tidak', value : null }
    },  
]

const fuzzifikasi = (crisp, kategori) => {
    let tempArray = [
        null, null, null
    ]

    if (crisp > kategori[0] && crisp <= kategori[1])
    {
        tempArray[0] = -1 * (crisp - kategori[1]) / (kategori[1] - kategori[0])
    }
    else if (crisp > kategori[1] && crisp <= kategori[2])
    {
        tempArray[0] = -1 * (crisp - kategori[2]) / (kategori[2] - kategori[1])
        tempArray[1] = (crisp - kategori[1]) / (kategori[2] - kategori[1])
    }
    else if (crisp > kategori[2] && crisp <= kategori[3])
    {
        tempArray[1] = (crisp - kategori[2]) / (kategori[3] - kategori[2])
    }
    else if (crisp == kategori[3]){
        tempArray[1] = 1
    }
    else if (crisp > kategori[3] && crisp <= kategori[4])
    {
        tempArray[1] = -1 * (crisp - kategori[4]) / (kategori[4] - kategori[3])
    }
    else if (crisp > kategori[4] && crisp <= kategori[5])
    {
        tempArray[1] = -1 * (crisp - kategori[5]) / (kategori[5] - kategori[4])
        tempArray[2] = (crisp - kategori[4]) / (kategori[5] - kategori[4])
    }
    else if (crisp > kategori[5] && crisp < kategori[6]){
        tempArray[2] = (crisp - kategori[5]) / (kategori[6] - kategori[5])
    }
    
    return tempArray
}

const inference = (pendapatan, hutang) => {
    let result = JSON.parse(JSON.stringify(aturanFuzzy))

    let count = 0
    for (let p = 0; p < 3; p++) {
        for (let h = 0; h < 3; h++) {
            if (pendapatan[p] && hutang[h]) {

                result[count]['p']['value'] = pendapatan[p]
                result[count]['h']['value'] = hutang[h]
                result[count]['d']['value'] = Math.min(...[pendapatan[p], hutang[h]])
                
                // console.log('p h level: ',result[p,h].d.level);
                count++
            }
        }
    }

    let iya = []
    let tidak = []

    result.forEach(type => {
        if (type.d.value) {
            if (type.d.level === 'iya') {
                iya.push(type.d.value)
            } else {
                tidak.push(type.d.value)
            }
        }
    });
    
    // cari maximum value dari masing masing array "iya" dan "tidak"
    var iyaMax = 0
    if (iya.length < 1) {
        iyaMax = -1
    } else {
        iyaMax = Math.max(...iya)
    }

    var tidakMax = 0
    if (tidak.length < 1) {
        tidakMax = -1
    } else {
        tidakMax = Math.max(...tidak)
    }
    
    return {
        iyaMax,
        tidakMax
    }
}

const defuzzifikasi = (himpunanFuzzi) => {

    let max
    max = Math.max(...[himpunanFuzzi.iyaMax, himpunanFuzzi.tidakMax])
    
    let min 
    min = Math.min(...[himpunanFuzzi.iyaMax, himpunanFuzzi.tidakMax])

    let hasil = ((max * 10) + (min * -10)) / (max + min)
    
    if (hasil > 0 ){
        return "iya"
    } else {
        return "tidak"
    }
}

const testCase = (aturan) => {
    console.log('     Pendapatan   Hutang    Bantuan')
    var iya =0
    var no = 0
    for (let i = 1; i < aturan.length; i++) {
   
        const hasil = testSingle(aturan[i][1], aturan[i][2])
        console.log(`${i} - P: ${aturan[i][1]}, H: ${aturan[i][2]} = ${hasil}`)
        const tmp = []
        if (hasil == 'iya'){
            iya++
            no++
            tmp.push(no)
            tmp.push(Number(aturan[i][1]))
            tmp.push(Number(aturan[i][2]))
            tebakan.push(tmp)
        }
        
        i === 100 ? console.log('-----------------------------------') : undefined   
    }
    console.log('Hasil Tebakan :');
    console.log(tebakan);
    

    const csv = papa.unparse({
        fields: ["No", "Pendapatan", "Hutang"],
        data: tebakan
    }, {
        complete: function(results, file) {
            console.log("Parsing complete:", results, file);
        },
        step: function(results, parser) {
            console.log("Row data:", results.data);
            console.log("Row errors:", results.errors);
        },
        error: function(error) {
            console.log("Errors:", error);
        }
    });

    try {
        // console.log(csv);
        var path='./TebakanTugas2.csv'; 
        fs.writeFile(path, csv, function(err,data) {
            if (err) {throw err;}
            else{ 
                // res.download(path);
            }
        })
      } catch (err) {
        console.error(err);
      }
}

const testSingle = (pendapatan, hutang) => {
    
    let Pendapatan = fuzzifikasi(pendapatan, PENDAPATAN)
    let Hutang = fuzzifikasi(hutang, HUTANG)
	let Inference = inference(Pendapatan, Hutang)
    let Defuzzi = defuzzifikasi(Inference)

    return (Defuzzi)
}

papa.parse(file, {
	complete: function(results) {
        testCase(results.data)
	}
});