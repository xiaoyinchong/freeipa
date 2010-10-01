/*  Authors:
 *    Pavel Zuna <pzuna@redhat.com>
 *
 * Copyright (C) 2010 Red Hat
 * see file 'COPYING' for use and warranty information
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; version 2 only
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 */

/* REQUIRES: ipa.js, details.js, search.js, add.js */

var ipa_entity_search_list = {};
var ipa_entity_add_list = {};
var ipa_entity_details_list = {};

/* use this to track individual changes between two hashchange events */
var window_hash_cache = {};

function ipa_entity_set_search_definition(obj_name, data)
{
    ipa_entity_search_list[obj_name] = data;
}

function ipa_entity_set_add_definition(obj_name, data)
{
    ipa_entity_add_list[obj_name] = data;
}

function ipa_entity_set_details_definition(obj_name, data)
{
    ipa_entity_details_list[obj_name] = data;
}

function ipa_entity_setup(container)
{
    var id = container.attr('id');

    var state = id + '-facet';
    var facet = $.bbq.getState(state, true) || 'search';
    var last_facet = window_hash_cache[state];

    if (facet != last_facet) {
        _ipa_entity_setup(container);
        window_hash_cache[state] = facet;

    } else if (facet == 'search') {
        state = id + '-filter';
        var filter = $.bbq.getState(state, true);
        var last_filter = window_hash_cache[state];
        if (filter == last_filter) return;

        _ipa_entity_setup(container);
        window_hash_cache[state] = filter;

    } else if (facet == 'details') {
        state = id + '-pkey';
        var pkey = $.bbq.getState(state, true);
        var last_pkey = window_hash_cache[state];
        if (pkey == last_pkey) return;

        _ipa_entity_setup(container);
        window_hash_cache[state] = pkey;

    } else if (facet == 'associate') {
        state = id + '-enroll';
        var enroll = $.bbq.getState(state, true);
        var last_enroll = window_hash_cache[state];
        if (enroll == last_enroll) return;

        _ipa_entity_setup(container);
        window_hash_cache[state] = enroll;
    }
}

function _ipa_entity_setup(jobj) {

    var obj_name = jobj.attr('id');

    function reset_on_click() {
        ipa_details_reset(obj_name);
        return (false);
    };

    function update_on_click() {
        var pkey_name = ipa_objs[obj_name].primary_key;
        ipa_details_update(obj_name, ipa_details_cache[obj_name][pkey_name][0]);
        return (false);
    };

    function new_on_click() {
        add_dialog_create(obj_name, ipa_entity_add_list[obj_name]);
        return (false);
    };

    function switch_view() {
        var enroll_obj_name = $(this).attr('title');
        var state = {};
        if (enroll_obj_name != 'search' && enroll_obj_name != 'details') {
            state[obj_name + '-facet'] = 'associate';
            state[obj_name + '-enroll'] = enroll_obj_name;
        } else {
            state[obj_name + '-facet'] = enroll_obj_name;
            state[obj_name + '-enroll'] = '';
        }
        $.bbq.pushState(state);
    };

    function setup_search_facet() {
        var filter = $.bbq.getState(obj_name + '-filter', true);
        search_create(obj_name, ipa_entity_search_list[obj_name], jobj);

        $('<input />',{
            type:"submit",
            value: ipa_messages.button.add, 
            click:new_on_click
        }).appendTo($( "div#" + obj_name + " > div.search-controls"));

        if (typeof filter != 'undefined')
            search_load(jobj, filter, null, null);
    };

    function setup_details_facet() {
        var pkey = $.bbq.getState(obj_name + '-pkey', true);
        ipa_entity_generate_views(obj_name, jobj, switch_view);
        ipa_details_create(obj_name, ipa_entity_details_list[obj_name], jobj);
        jobj.find('.details-reset').click(reset_on_click);
        jobj.find('.details-update').click(update_on_click);

        if (pkey)
            ipa_details_load(jobj, pkey, null, null);
    };

    function setup_associate_facet() {
        var pkey = $.bbq.getState(obj_name + '-pkey', true) || '';
        var enroll_obj_name = $.bbq.getState(obj_name + '-enroll', true) || '';
        var attr = ipa_get_member_attribute(obj_name, enroll_obj_name);
        var columns  = [
            {
                title: ipa_objs[enroll_obj_name].label,
                column: attr + '_' + enroll_obj_name
            }
        ];
        var frm = new AssociationList(obj_name, pkey, enroll_obj_name, columns, jobj);
        ipa_entity_generate_views(obj_name, jobj, switch_view);
        frm.setup();
    };

    jobj.empty();

    var facet = $.bbq.getState(obj_name + '-facet', true) || 'search';
    if (facet == 'search') {
        setup_search_facet();
    } else if (facet == 'details') {
        setup_details_facet();
    } else if (facet == 'associate') {
        setup_associate_facet();
    }
}

function ipa_entity_generate_views(obj_name, container, switch_view)
{
    var ul = $('<ul></ul>', {'class': 'entity-views'});

    //TODO replace the plus image with the correct image for each facet
    ul.append($('<li></li>', {
        title: 'search',
        text: 'Search',
        click: switch_view
    }).prepend('<img src="search.png"/>'));

    ul.append($('<li></li>', {
        text: 'Details',
        title: 'details',
        click: switch_view
    }).prepend('<img src="' + obj_name +'_details.png"/>'));

    var attribute_members = ipa_objs[obj_name].attribute_members;
    for (attr in attribute_members) {
        var objs = attribute_members[attr];
        for (var i = 0; i < objs.length; ++i) {
            var m = objs[i];
            var label = ipa_objs[m].label;

            ul.append($('<li></li>', {
                title: m,
                text:label,
                click: switch_view
            }).prepend('<img src="' + ipa_objs[m].name + '_member.png"/>'));
        }
    }

    container.append(ul);
}

function ipa_entity_quick_links(tr, attr, value, entry_attrs) {

    var obj_name = tr.closest('.search-container').attr('title');
    var pkey = ipa_objs[obj_name].primary_key;
    var pkey_value = entry_attrs[pkey][0];

    var td = $("<td/>");
    tr.append(td);

    $("<a/>", {
        href: "#details",
        click: function() {
            var state = {};
            state[obj_name+'-facet'] = 'details';
            state[obj_name+'-pkey'] = pkey_value;
            nav_push_state(state);
            return false;
        }
    }).append($('<img/>', {
         src: obj_name+'_details.png'
    })).appendTo(td);

    var attribute_members = ipa_objs[obj_name].attribute_members;
    for (attr_name in attribute_members) {
        var objs = attribute_members[attr_name];
        for (var i = 0; i < objs.length; ++i) {
            var m = objs[i];

            $("<a/>", {
                href: '#'+m,
                click: function(m) {
                    return function() {
                        var state = {};
                        state[obj_name+'-facet'] = 'associate';
                        state[obj_name+'-enroll'] = m;
                        state[obj_name+'-pkey'] = pkey_value;
                        nav_push_state(state);
                        return false;
                    }
                }(m)
            }).append($('<img/>', {
                src: m+'_member.png'
            })).appendTo(td);
        }
    }
}
