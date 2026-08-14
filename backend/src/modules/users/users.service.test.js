const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('./users.repository');
const service = require('./users.service');

test('user pagination normalizes filters and caps page size', async () => {
    let received;
    repository.findAllUsers = async (filters) => { received = filters; return { items: [{ id: 1 }], total: 201 }; };
    const result = await service.getUsers({ page: '2', pageSize: '1000', search: ' Ada ', status: '0', order: 'desc' });
    assert.equal(received.pageSize, 100);
    assert.equal(received.search, 'Ada');
    assert.equal(received.status, 0);
    assert.equal(result.totalPages, 3);
});

test('student creation requires a class', async () => {
    repository.findRoleNameById = async () => 'student';
    await assert.rejects(
        service.createUser({ role_id: 3, name: 'Student', email: 'student@example.com', password: '12345678' }),
        (error) => error.errorCode === 'STUDENT_CLASS_REQUIRED'
    );
});

test('new user passwords require at least eight characters', async () => {
    await assert.rejects(
        service.createUser({ role_id: 2, name: 'Teacher', email: 'teacher@example.com', password: '1234567' }),
        (error) => error.errorCode === 'PASSWORD_TOO_SHORT'
    );
});

test('user options only allow supported roles and normalize class filters', async () => {
    let received;
    repository.findUserOptions = async (filters) => { received = filters; return [{ id: 1, name: 'Ada', class_id: 4 }]; };

    const result = await service.getUserOptions({ role: ' STUDENT ', class_id: '4' });

    assert.deepEqual(received, { role: 'student', classId: 4 });
    assert.equal(result.length, 1);
    await assert.rejects(
        service.getUserOptions({ role: 'admin' }),
        (error) => error.errorCode === 'INVALID_USER_OPTION_ROLE'
    );
});

test('user deletion archives the account and forwards the acting admin', async () => {
    let received;
    repository.archiveUser = async (id, actorId) => { received = { id, actorId }; return { id: 7, status: -1 }; };
    const user = await service.deleteUser(7, 3);
    assert.deepEqual(received, { id: 7, actorId: 3 });
    assert.deepEqual(user, { id: 7, status: -1 });
});

test('restoring a deleted user returns an active account', async () => {
    repository.restoreUser = async () => ({ id: 7, status: 1 });
    assert.deepEqual(await service.restoreUser(7), { id: 7, status: 1 });
});

test('user status filters reject unsupported values', async () => {
    await assert.rejects(
        service.getUsers({ status: '2' }),
        (error) => error.errorCode === 'INVALID_USER_STATUS'
    );
});

test('bulk preview freezes a normalized filtered selection', async () => {
    let receivedFilters;
    let receivedPreview;
    repository.findUserIds = async (filters) => { receivedFilters = filters; return [3, 8]; };
    repository.previewBulkUsers = async (ids, action, actorId) => {
        receivedPreview = { ids, action, actorId };
        return { selected: 2, eligible: 1, skipped: 1 };
    };

    const result = await service.previewBulkUsers({
        selector: { type: 'filter', filters: { search: ' Ada ', role_id: '3', status: '0' }, excluded_ids: ['5'] },
        action: { type: 'assign_class', class_id: '4' }
    }, 9);

    assert.deepEqual(receivedFilters, { search: 'Ada', role_id: 3, status: 0, excludedIds: [5] });
    assert.deepEqual(receivedPreview, { ids: [3, 8], action: { type: 'assign_class', class_id: 4 }, actorId: 9 });
    assert.deepEqual(result.resolved_ids, [3, 8]);
});

test('bulk operations reject selections larger than 1000 users', async () => {
    await assert.rejects(
        service.previewBulkUsers({ selector: { type: 'ids', ids: Array.from({ length: 1001 }, (_, index) => index + 1) }, action: { type: 'activate' } }, 1),
        (error) => error.errorCode === 'BULK_SELECTION_LIMIT_EXCEEDED' && error.statusCode === 422
    );
});
