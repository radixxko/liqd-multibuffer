const assert = require('assert');
const crypto = require('crypto');

const TEST_RUNS_FACTOR = 1;

const MultiBuffer = require('../lib/multibuffer');

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const RandomChar = () => CHARS[Math.floor( Math.random() * CHARS.length )];
const RandomStr = ( length ) => crypto.randomBytes( Math.ceil(length/2) ).toString('hex').substr(0, length);
const Random = ( min, max ) => min + Math.floor( Math.random() * ( max - min + 0.99999999 ));
const FillBuffer = ( multibuffer, blocks, max_size ) =>
{
    let data = multibuffer.slice( 0 ).toString('utf8');

    for( let i = 0; i < blocks; ++i )
    {
        let chunk = RandomStr( Random( 1, max_size ));

        data += chunk;
        multibuffer.append( Buffer.from( chunk, 'utf8' ));
    }

    return data;
}

const Slice = ( multibuffer, ...args ) => Buffer.concat( multibuffer.slice( ...args )).toString('utf8');
const Splice = ( multibuffer, ...args ) => Buffer.concat( multibuffer.splice( ...args )).toString('utf8');
const SpliceStr = ( str, ...args ) => { let arr = str.split(''); return [ arr.splice( ...args ).join(''), arr.join('') ]};

describe( 'Tests', ( done ) =>
{
    it('should create empty multibuffer', function()
	{
		const multibuffer = new MultiBuffer();

        assert.ok( multibuffer.length === 0 && multibuffer.slice(0).length === 0, 'MultiBuffer is not empty' );

        multibuffer.append( Buffer.alloc(0) );

        assert.ok( multibuffer.length === 0 && multibuffer.slice(0).length === 0, 'MultiBuffer is not empty after appending empty buffer' );

        multibuffer.append( Buffer.alloc(0), Buffer.alloc(0) );

        assert.ok( multibuffer.length === 0 && multibuffer.slice(0).length === 0, 'MultiBuffer is not empty after appending empty buffers' );
	});

    it('should create empty multibuffer from empty buffers', function()
	{
		const multibuffer = new MultiBuffer( Buffer.alloc(0), Buffer.alloc(0), Buffer.alloc(0) );

        assert.ok( multibuffer.length === 0 && multibuffer.slice(0).length === 0 && Slice( multibuffer, 0 ) === '' && Splice( multibuffer, 0 ) === '', 'MultiBuffer is not empty' );
	});

    it('should create multibuffer from buffers', function()
	{
		const multibuffer = new MultiBuffer( Buffer.from('ab', 'utf8'), Buffer.alloc(0), Buffer.from('cd', 'utf8') );

        assert.ok( multibuffer.length === 4 && multibuffer.slice(0).length === 2 && Slice(multibuffer) === 'abcd', 'MultiBuffer is not created properly' );
	});

    it('should slice multibuffer', function()
	{
		const blocks = 500, multibuffer = new MultiBuffer(), data = FillBuffer( multibuffer, blocks, 10 );

        assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Slice( multibuffer, 0 ) === data && Slice( multibuffer ) === data, 'MultiBuffer is not initialized properly' );

        assert.ok( Slice( multibuffer, 0, data.length ) === data, 'MultiBuffer is not sliced properly' );
        assert.ok( Slice( multibuffer, 0, data.length + 1 ) === data, 'MultiBuffer is not sliced properly' );

        assert.ok( Slice( multibuffer, data.length, data.length ) === '', 'MultiBuffer is not sliced properly' );
        assert.ok( Slice( multibuffer, data.length, data.length + 1 ) === '', 'MultiBuffer is not sliced properly' );
        assert.ok( Slice( multibuffer, data.length, 0 ) === '', 'MultiBuffer is not sliced properly' );

        for( let i = 0; i < 1000 * TEST_RUNS_FACTOR; ++i )
        {
            let start = Random( 0, data.length ), end = data.length;

            assert.ok( Slice( multibuffer, start, end ) === data.substr( start, end - start ), 'MultiBuffer is not sliced properly' );
        }

        for( let i = 0; i < 1000 * TEST_RUNS_FACTOR; ++i )
        {
            let start = 0, end = Random( 0, data.length );

            assert.ok( Slice( multibuffer, start, end ) === data.substr( start, end - start ), 'MultiBuffer is not sliced properly, end = ' + end + ', length = ' + data.length );
        }

        for( let i = 0; i < 10000 * TEST_RUNS_FACTOR; ++i )
        {
            let start = Random( 0, data.length ), end = Random( start, data.length );
            let buff_start = Random( 0, 1 ) || start === data.length ? start : start - data.length, buff_end = Random( 0, 1 ) || end === data.length ? end : end - data.length;
            let str_slice = data.substr( start, end - start );
            let buff_slice = Slice( multibuffer, buff_start, buff_end );

            if( !( multibuffer.length === data.length && buff_slice === str_slice ))
            {
                console.log({ start, end, buff_start, buff_end });
                console.log({ buf: buff_slice, str: str_slice });

                assert.fail( 'MultiBuffer is not sliced properly' );
            }
        }
	})
    .timeout( 30000 );

    it('should splice multibuffer', function()
	{
        for( let j = 0; j < 10000 * TEST_RUNS_FACTOR; ++j )
        {
    		let blocks = 10, multibuffer = new MultiBuffer(), data = FillBuffer( multibuffer, blocks, 10 );

            assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Slice( multibuffer, 0 ) === data, 'MultiBuffer is not initialized properly' );

            while( data.length )
            {
                let str_splice, start = Random( 0, Math.floor( data.length / 4 )), end = Random( start, data.length );
                let splice_start = Random( 0, 1 ) || start === data.length ? start : start - data.length, splice_cnt = Random( 0, 1 ) || end === data.length ? end - start : end - data.length;
                let before = { data: data+'', buff: Slice(multibuffer), buff: multibuffer.slice().map( b => b.toString('utf8') ) };

                [ str_splice, data ] = SpliceStr( data, splice_start, end - start );
                let buff_splice = Splice( multibuffer, splice_start, splice_cnt );

                if( !( buff_splice === str_splice && multibuffer.length === data.length ))
                {
                    console.log({ start, end, length: end - start, splice_start, splice_cnt });
                    console.log({ buf: buff_splice, str: str_splice });
                    console.log({ buf: multibuffer.length, data: data.length });
                    console.log({ before, after: { data, buff: Slice(multibuffer) } });

                    assert.fail( 'MultiBuffer is not spliced properly' );
                }
            }
        }
	})
    .timeout( 30000 );

    it('should insert buffers to multibuffer in splice', function()
	{
        for( let j = 0; j < 2000 * TEST_RUNS_FACTOR; ++j )
        {
            let blocks = 10, multibuffer = new MultiBuffer(), data = FillBuffer( multibuffer, blocks, 10 );

            assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Slice( multibuffer, 0 ) === data, 'MultiBuffer is not initialized properly' );

            for( let i = 0; i < 10; ++i )
            {
                let before = { data: data+'', buff: Slice(multibuffer), buff: multibuffer.slice().map( b => b.toString('utf8') ) };
                let parts = new Array(Random( 1, 5 )).fill(0).map( a => RandomStr(Random( 1, 10 )) );
                let str_splice, start = Random( 0, data.length ), end = Random( start, data.length );
                let splice_start = Random( 0, 1 ) || start === data.length ? start : start - data.length, splice_cnt = Random( 0, 1 ) || end === data.length ? end - start : end - data.length;

                [ str_splice, data ] = SpliceStr( data, splice_start, end - start, ...parts );
                let buff_splice = Splice( multibuffer, splice_start, splice_cnt, ...parts.map( s => Buffer.from( s, 'utf8' )));

                if( !( buff_splice === str_splice && multibuffer.length === data.length && Slice(multibuffer) === data ))
                {
                    console.log({ start, end, length: end - start, splice_start, splice_cnt });
                    console.log({ parts, buf: buff_splice, str: str_splice });
                    console.log({ buf: multibuffer.length, data: data.length });
                    console.log({ before, after: { data, buff: Slice(multibuffer) } });

                    assert.fail( 'MultiBuffer is not spliced properly' );
                }
            }
        }
	}).timeout(30000);

    it('should spliceConcat multibuffer', function()
	{
        const multibuffer = new MultiBuffer( Buffer.from('01234', 'utf8'), Buffer.from('56789', 'utf8'), Buffer.from('abcdef', 'utf8'));

        assert.ok( multibuffer.length === 16 && multibuffer.slice(0).length === 3 && Slice( multibuffer, 0 ) === '0123456789abcdef', 'MultiBuffer is not initialized properly' );

        assert.ok( multibuffer.spliceConcat( 0, 0 ).toString('utf8') === '' && multibuffer.slice(0).length === 3 && Slice( multibuffer, 0 ) === '0123456789abcdef', 'MultiBuffer is not spliceConcated properly' );
        assert.ok( multibuffer.spliceConcat( 0, 4 ).toString('utf8') === '0123' && multibuffer.slice(0).length === 3 && Slice( multibuffer, 0 ) === '456789abcdef', 'MultiBuffer is not spliceConcated properly' );
        assert.ok( multibuffer.spliceConcat( 0 ).toString('utf8') === '456789abcdef' && multibuffer.slice(0).length === 0 && Slice( multibuffer, 0 ) === '', 'MultiBuffer is not spliceConcated properly' );
	});

    it('should get at index', function()
	{
		const blocks = 500, multibuffer = new MultiBuffer(), data = FillBuffer( multibuffer, blocks, 10 );

        assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Buffer.concat(multibuffer.slice(0)).toString('utf8') === data, 'MultiBuffer is not initialized properly' );
        assert.ok( multibuffer.get( multibuffer.length + 1 ) === undefined, 'MultiBuffer is not accessed properly' );

        for( let i = 0; i < 100000 * TEST_RUNS_FACTOR; ++i )
        {
            let index = Random( 0, data.length - 1 ) - Random( 0, 1 ) * data.length;

            assert.ok( multibuffer.length === data.length && Buffer.from([multibuffer.get( index )]).toString('utf8') === data[ index < 0 ? data.length + index : index ], 'MultiBuffer is not accessed properly' );
        }
	})
    .timeout( 30000 );;

    it('should set at index', function()
	{
		const blocks = 10, multibuffer = new MultiBuffer(), data = FillBuffer( multibuffer, blocks, 10 );

        assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Buffer.concat(multibuffer.slice(0)).toString('utf8') === data, 'MultiBuffer is not initialized properly' );

        for( let i = 0; i < 100000 * TEST_RUNS_FACTOR; ++i )
        {
            let index = Random( 0, data.length - 1 ) - Random( 0, 1 ) * data.length;
            let char = RandomChar();

            data[ index < 0 ? data.length + index : index ] = char;
            assert.ok( multibuffer.length === data.length && Buffer.from([multibuffer.set( index, Buffer.from(char, 'utf8')[0] )]).toString('utf8') === char, 'MultiBuffer is not set properly' );
            assert.ok( Slice(multibuffer) === data, 'MultiBuffer is not set properly' );
        }
	})
    .timeout( 30000 );

    it('should find position with indexOf with buffer needle', function()
	{
		const blocks = 10, multibuffer = new MultiBuffer(), data = Buffer.from( FillBuffer( multibuffer, blocks, 10 ), 'utf8');

        assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Slice( multibuffer ) === data.toString('utf8'), 'MultiBuffer is not initialized properly' );

        for( let i = 0; i < 1000000 * TEST_RUNS_FACTOR; ++i )
        {
            let index = Random( 0, data.length - 1 ), length = Random( 1, 30 ), offset = Math.random() < 0.2 ? 0 : Random( 0, data.length - 1 );
            let needle = data.slice( index, length );
            let data_index = data.indexOf( needle, offset );
            let buff_index = multibuffer.indexOf( needle, offset );

            if( data_index !== buff_index )
            {
                console.log({ data_index, buff_index, index, offset, needle: needle.toString('utf8'), data: data.toString('utf8'), buffer: multibuffer.slice(0).map( b => b.toString() ) });

                assert.fail( 'MultiBuffer is not searched properly' );
            }
        }

        assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Slice( multibuffer ) === data.toString('utf8'), 'MultiBuffer is not searched properly' );
	})
    .timeout( 30000 );

    it('should find position with indexOf  with string needle', function()
	{
		const blocks = 10, multibuffer = new MultiBuffer(), data = FillBuffer( multibuffer, blocks, 10 );

        assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Slice( multibuffer ) === data, 'MultiBuffer is not initialized properly' );

        for( let i = 0; i < 1000000 * TEST_RUNS_FACTOR; ++i )
        {
            let index = Random( 0, data.length - 1 ), length = Random( 1, 30 ), offset = Math.random() < 0.2 ? 0 : Random( 0, data.length - 1 );
            let needle = data.substr( index, length );
            let data_index = data.indexOf( needle, offset );
            let buff_index = multibuffer.indexOf( needle, offset, 'utf8' );

            if( data_index !== buff_index )
            {
                console.log({ data_index, buff_index, index, offset, needle: needle.toString('utf8'), data: data.toString('utf8'), buffer: multibuffer.slice(0).map( b => b.toString() ) });

                assert.fail( 'MultiBuffer is not searched properly' );
            }
        }

        assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Slice( multibuffer ) === data, 'MultiBuffer is not searched properly' );
	})
    .timeout( 30000 );

    it('should clear buffer', function()
	{
		const blocks = 10, multibuffer = new MultiBuffer(), data = FillBuffer( multibuffer, blocks, 10 );

        assert.ok( multibuffer.length === data.length && multibuffer.slice(0).length === blocks && Buffer.concat(multibuffer.slice(0)).toString('utf8') === data, 'MultiBuffer is not initialized properly' );

        multibuffer.clear();

        assert.ok( multibuffer.length === 0 && multibuffer.slice().length === 0 && Slice(multibuffer) === '', 'MultiBuffer is not cleared properly' );
	})

    it('shoud test corner cases', function()
    {
        const multibuffer = new MultiBuffer( Buffer.from('01234', 'utf8'), Buffer.from('56789', 'utf8'));

        assert.ok( multibuffer.indexOf( '9', 'utf8' ) === 9, 'MultiBuffer is not searched properly' );
        assert.ok( multibuffer.indexOf( '9', 20 ) === -1, 'MultiBuffer is not searched properly' );
        assert.ok( multibuffer.indexOf( '', 3 ) === 3, 'MultiBuffer is not searched properly' );
        assert.ok( multibuffer.indexOf( '' ) === 0, 'MultiBuffer is not searched properly' );
        assert.ok( multibuffer.indexOf( '', 20 ) === -1, 'MultiBuffer is not searched properly' );
        assert.ok( Splice( multibuffer, 0, 10, Buffer.from('abcdef', 'utf8')) === '0123456789' && Slice( multibuffer ) === 'abcdef' );
        assert.ok( Splice( multibuffer, -1, Buffer.from( 'ghi' )) === '' && Slice( multibuffer ) === 'abcdeghif' );
        assert.ok( Splice( multibuffer ) === 'abcdeghif' && Slice( multibuffer ) === '' );
    });

    it('should be faster than concatenating buffers', function()
	{
        let block_size = 1024, block = crypto.randomBytes(block_size), iterations = 50, blocks = 250, tmp;

        let buffer_start = process.hrtime();

        for( let i = 0; i < iterations; ++i )
        {
            let buffer = Buffer.alloc(0);

            for( let j = 0; j < blocks; ++j )
            {
                buffer = Buffer.concat([ buffer, block ]);
                tmp += buffer.length;
            }

            for( let j = 0; j < blocks / 2; j += 2 )
            {
                let buffer_block = buffer.slice( block, j * block_size, ( j + 2 ) * block_size );
                tmp += buffer_block.length;
            }
        }

        let buffer_end = process.hrtime( buffer_start ); buffer_end = buffer_end[0] * 1e3 + buffer_end[1] / 1e6;

        let multibuffer_start = process.hrtime();

        for( let i = 0; i < iterations; ++i )
        {
            let multibuffer = new MultiBuffer();

            for( let j = 0; j < blocks; ++j )
            {
                multibuffer.append( block );
                tmp += multibuffer.length;
            }

            for( let j = 0; j < blocks / 2; j += 2 )
            {
                let multibuffer_block = multibuffer.slice( block, j * block_size, ( j + 2 ) * block_size );
                tmp += multibuffer_block.length;
            }
        }

        let multibuffer_end = process.hrtime( multibuffer_start ); multibuffer_end = multibuffer_end[0] * 1e3 + multibuffer_end[1] / 1e6;

        assert.ok( buffer_end > multibuffer_end, 'MultiBuffer is not faster' );
	})
    .timeout( 30000 );
});
