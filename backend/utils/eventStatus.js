const toDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const computeDisplayStatus = (event) => {
    if (!event) return 'draft';

    if (event.status === 'draft' || event.status === 'completed') {
        return event.status;
    }

    if (event.status === 'closed') {
        return 'closed';
    }

    const now = new Date();
    const startTime = toDate(event.startTime);
    const endTime = toDate(event.endTime);

    if (startTime && endTime && now >= startTime && now <= endTime) {
        return 'ongoing';
    }

    if (endTime && now > endTime) {
        return 'closed';
    }

    return 'published';
};

const computeRegistrationStatus = (event) => {
    if (!event) return 'closed';

    const eventStatus = computeDisplayStatus(event);
    if (eventStatus === 'draft' || eventStatus === 'closed' || event.status === 'completed') {
        return 'closed';
    }

    if (event.registrationManuallyClosed) {
        return 'closed';
    }

    const deadline = toDate(event.registrationDeadline);
    if (deadline && deadline < new Date()) {
        return 'closed';
    }

    return 'open';
};

const isRegistrationClosed = (event) => computeRegistrationStatus(event) === 'closed';

module.exports = {
    computeDisplayStatus,
    computeRegistrationStatus,
    isRegistrationClosed
};
