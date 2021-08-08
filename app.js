// Activate all tooltips
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

// UI Code
const btnAddRow = document.querySelector('#add-row');
const btnRemoveRow = document.querySelector('#remove-row');
const stnActivities = document.querySelector('.activities');

btnAddRow.addEventListener('click', () => {
    if ('content' in document.createElement('template')) {
        let accordionBody = document.querySelector('.accordion-body');
        let template = document.querySelector('#activities-row');

        toggleLastBorder();
        accordionBody.appendChild(template.content.cloneNode(true));
    }
})

btnRemoveRow.addEventListener('click', () => {
    if (document.querySelector('.accordion-body').children.length > 1) {
        const lastRow = document.querySelector('.accordion-body > :last-child');
        lastRow.remove();
        toggleLastBorder();
    }
});

function toggleLastBorder() {
    const lastRow = document.querySelector('.accordion-body > :last-child');
    lastRow && lastRow.classList.toggle('border-bottom');
    lastRow && lastRow.classList.toggle('border-dark');
}

stnActivities.addEventListener('change', (e) => {
    if (e.target.id === 'start-date' || e.target.id === 'end-date' || e.target.id === 'avg-hrs') {
        updateTotalHours(e);
    }

    updateSummary(getActivities());
});

function updateTotalHours(e) {
    const commonAncenstor = e.path[3];
    const startDateElement = commonAncenstor.querySelector('#start-date');
    const endDateElement = commonAncenstor.querySelector('#end-date');
    const avgHrsElement = commonAncenstor.querySelector('#avg-hrs');
    const targetElement = commonAncenstor.querySelector('#total-hrs');

    let date = new Date(startDateElement.value);
    const endDate = new Date(endDateElement.value);
    const avgHrs = parseInt(avgHrsElement.value);

    if (avgHrs && !isNaN(date.getTime()) && !isNaN(endDate.getTime())) {
        let totalHrs = 0;

        while (date <= endDate) {
            if (date.getDay() !== 5 && date.getDay() !== 6) {
                totalHrs += avgHrs;
            }

            date = new Date(date.getTime() + (24 * 60 * 60 * 1000));
        }

        targetElement.value = totalHrs;
    }
}

class Activity {
    constructor(activityHTMLElement) {
        const inputElements = activityHTMLElement.querySelectorAll('input, select, textarea');
        const vals = {};

        for (let element of inputElements) {
            vals[element.name] = element.value
        }

        this.activity = vals['activity'];
        this.avgHrs = parseInt(vals['avg-hrs']);
        this.endDateTime = new Date(`${vals['end-date']}T${vals['end-time']}:00:00.000-05:00`);
        this.startDateTime = new Date(`${vals['start-date']}T${vals['start-time']}:00:00.000-05:00`);
        this.technician = vals['technician'];
        this.totalHrs = parseInt(vals['total-hrs']);
        this.travelDay = vals['travel-day'];
        this.visitType = vals['visit-type'];
        this.details = vals['details'];
    }

    get duration() {
        return weeksBetween(this.startOfWeek, this.endOfWeek);
    }

    get startOfWeek() {
        return new Date(this.startDateTime.getTime() - ((this.startDateTime.getDay() - 1) * 24 * 60 * 60 * 1000));
    }

    get endOfWeek() {
        return new Date(this.endDateTime.getTime() + ((7 - this.endDateTime.getDay()) * 24 * 60 * 60 * 1000))
    }
}

function getActivities() {
    const activityHTMLElements = document.querySelectorAll('.activity')
    const activities = [];
    for (let activityElement of activityHTMLElements) {
        activities.push(new Activity(activityElement));
    }

    return activities;
}

// Chart Generating Code
function updateSummary(activities) {
    activities.sort((current, next) => {
        if (current.startDateTime < next.startDateTime) {
            return -1;
        } else if (current.startDateTime > next.startDateTime) {
            return 1;
        } else {
            if (current.duration < next.duration) {
                return -1;
            } else if (current.duration > next.duration) {
                return 1;
            } else {
                return 0;
            }
        }
    });

    makeChartHeaders(activities);
    makeChartBody(activities);
    makePrintTables(activities);
}

function makeChartHeaders(activities) {
    const header = document.querySelector('.gantt thead > tr');
    while (header.firstChild) {
        header.removeChild(header.firstChild);
    }

    const corner = document.createElement('th');
    corner.setAttribute('scope', 'col');
    corner.textContent = 'Activity Summary';
    header.append(corner);

    let duration = weeksBetween(activities[0].startOfWeek, activities[activities.length - 1].endOfWeek);
    let date = new Date(activities[0].startOfWeek);

    while (duration > 0) {
        const th = document.createElement('th');
        th.setAttribute('scope', 'col');
        th.textContent = startOfWeekString(date);
        header.append(th);

        date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);
        duration--;
    }
}

function weeksBetween(d1, d2) {
    const week = 7 * 24 * 60 * 60 * 1000;
    return Math.ceil((d2 - d1) / week);
}

function startOfWeekString(date) {
    const startOfWeek = new Date();
    startOfWeek.setTime(date.getTime() - ((date.getDay() - 1) * 24 * 60 * 60 * 1000));
    return `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()}`;
}

function makeChartBody(activities) {
    const body = document.querySelector('.gantt tbody');

    while (body.firstChild) {
        body.removeChild(body.firstChild);
    }

    activities.forEach((activity) => {
        if (activity.activity && !isNaN(activity.startDateTime.getTime()) && !isNaN(activity.endDateTime.getTime())) {
            const tr = document.createElement('tr');
            let description = document.createElement('td');
            description.textContent = activity.activity;
            description.classList.add('activity-description');
            tr.append(description);

            let startOffset = weeksBetween(activities[0].startOfWeek, activity.startOfWeek)
            while (startOffset > 0) {
                let leadingSpace = document.createElement('td');
                tr.append(leadingSpace);
                startOffset--;
            }

            let ganttBar = document.createElement('td');
            ganttBar.setAttribute('colspan', activity.duration);
            ganttBar.textContent = activity.visitType;

            let color = '';
            switch (activity.visitType) {
                case 'Install':
                    color = 'table-primary';
                    break;
                case 'Training':
                    color = 'table-success';
                    break;
                case 'Repair':
                    color = 'table-danger';
                    break;
                case 'Travel':
                    color = 'table-secondary';
                    break;
                case 'Site Visit':
                    color = 'table-info';
                    break;
            }

            ganttBar.classList.add(color);
            tr.append(ganttBar);

            let endOffset = weeksBetween(activity.endOfWeek, activities[activities.length - 1].endOfWeek);
            while (endOffset > 0) {
                let trailingSpace = document.createElement('td');
                tr.append(trailingSpace);
                endOffset--;
            }

            body.append(tr);
        }
    })
}

function makePrintTables(activities) {
    const detailTable = document.querySelector('#detail-table > tbody');
    const detailHeaders = ['activity', 'technician', 'details'];

    while (detailTable.firstChild) {
        detailTable.firstChild.remove();
    }

    activities.forEach(activity => {
        let tr = document.createElement('tr');

        for (let header of detailHeaders) {
            let td = document.createElement('td');
            td.textContent = activity[header];
            if (header === 'activity') td.classList.add('activity-descrption');
            tr.append(td);
        }

        detailTable.append(tr);
    })

    const summaryTable = document.querySelector('#summary-table > tbody');
    const summaryHeaders = ['activity', 'visitType', 'startDateTime', 'endDateTime', 'avgHrs', 'totalHrs', 'travelDay'];

    while (summaryTable.firstChild) {
        summaryTable.firstChild.remove();
    }

    activities.forEach(activity => {
        if (activity.activity && activity.technician && !isNaN(activity.startDateTime.getTime()) && !isNaN(activity.endDateTime.getTime())) {
            let tr = document.createElement('tr');

            for (let header of summaryHeaders) {
                let td = document.createElement('td');

                switch (header) {
                    case 'startDateTime':
                    case 'endDateTime':
                        let date = activity[header];
                        let [day, month, year] = [date.getDate(), date.getMonth(), date.getFullYear()]
                        td.textContent = `${month + 1}/${day}/${year % 1000}`;
                        tr.append(td)
                        td = document.createElement('td');
                        td.textContent = `${date.toLocaleTimeString('en-US').slice(0, 4)} ${date.toLocaleTimeString('en-US').slice(-2)}`;
                        break;
                    default:
                        td.textContent = activity[header];
                        break;
                }

                tr.append(td);
            }

            summaryTable.append(tr);
        }
    });

}

function runTest() {
    const testTemplate1 = document.querySelector('#test-input-1');
    const testTemplate2 = document.querySelector('#test-input-2');
    const testInput1 = testTemplate1.content.cloneNode(true);
    const testInput2 = testTemplate2.content.cloneNode(true);
    const testActivities = [new Activity(testInput1), new Activity(testInput2)];
    updateSummary(testActivities);
}